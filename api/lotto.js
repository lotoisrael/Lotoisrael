export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300',
  };

  try {
    const res = await fetch('https://www.pais.co.il/lotto/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
        'Referer': 'https://www.pais.co.il/',
      },
    });

    if (!res.ok) throw new Error(`pais returned ${res.status}`);
    const html = await res.text();

    // מספרים רגילים
    const numMatches = [...html.matchAll(/class="[^"]*(?:RegularBall|regular-ball|regularBall)[^"]*"[^>]*>\s*(\d+)\s*</gi)];
    let numbers = numMatches.map(m => parseInt(m[1])).filter(n => n >= 1 && n <= 37);

    // fallback — חיפוש כללי יותר
    if (numbers.length < 6) {
      const fallback = [...html.matchAll(/>\s*(\d{1,2})\s*<\/(?:span|div|td)/g)]
        .map(m => parseInt(m[1])).filter(n => n >= 1 && n <= 37);
      numbers = [...new Set(fallback)].slice(0, 6);
    }

    // מספר חזק
    const strongMatch = html.match(/class="[^"]*(?:SpecialBall|special-ball|specialBall|StrongBall|strong-ball)[^"]*"[^>]*>\s*(\d+)\s*</i);
    const strongNumber = strongMatch ? parseInt(strongMatch[1]) : null;

    // מספר הגרלה
    const drawMatch = html.match(/(?:הגרלה|גרלה)\s*(?:מס['.׳]?\s*)?(?:מספר\s*)?(\d{4})/);
    const drawNumber = drawMatch ? parseInt(drawMatch[1]) : null;

    // תאריך
    const dateMatch = html.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    const date = dateMatch ? `${dateMatch[1].padStart(2,'0')}/${dateMatch[2].padStart(2,'0')}/${dateMatch[3]}` : null;

    // פרסים
    const prizeMatches = [...html.matchAll(/([\d,]{5,})\s*(?:₪|ש[״"]ח)/g)];
    const prizes = prizeMatches.map(m => parseInt(m[1].replace(/,/g, ''))).filter(n => n > 100000);
    const totalPrizes = prizes.length ? Math.max(...prizes) : null;

    if (!numbers || numbers.length < 6) {
      return new Response(JSON.stringify({ error: 'parse_failed', html_len: html.length }), { status: 500, headers });
    }

    return new Response(JSON.stringify({
      drawNumber,
      date,
      numbers: numbers.sort((a, b) => a - b),
      strongNumber,
      totalPrizes,
      firstPrize: null,
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
