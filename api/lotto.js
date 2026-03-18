export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300',
  };

  try {
    // paisresults.co.il מחזיר HTML סטטי — קל לפרסר
    const res = await fetch('https://www.paisresults.co.il/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'he-IL,he;q=0.9',
      },
    });

    if (!res.ok) throw new Error(`http ${res.status}`);
    const html = await res.text();

    // ── Parse כל ההגרלות מהטקסט ──
    // פורמט: "בהגרלה מספר: 3907 מתאריך: 17/03/2026 עלו המספרים: 01 , 02 , 03 , 04 , 05 , 06 המספר החזק: 3"
    const drawRegex = /בהגרלה מספר:\s*(\d+)\s+מתאריך:\s*(\d{2}\/\d{2}\/\d{4})\s+עלו המספרים:\s*([\d\s,]+?)המספר החזק:\s*(\d+)/g;

    const draws = [];
    let match;
    while ((match = drawRegex.exec(html)) !== null) {
      const nums = match[3].split(',').map(n => parseInt(n.trim())).filter(n => n >= 1 && n <= 37);
      const strong = parseInt(match[4]);
      if (nums.length === 6 && strong >= 1 && strong <= 7) {
        draws.push({
          drawNumber: parseInt(match[1]),
          date: match[2],
          numbers: nums.sort((a, b) => a - b),
          strong,
        });
      }
    }

    if (!draws.length) throw new Error('no draws parsed');

    // הגרלה ראשונה = האחרונה (הכי חדשה)
    const latest = draws[0];

    // פרסים מהגרלה האחרונה
    const prizeRegex = new RegExp(
      `בהגרלה מספר:\\s*${latest.drawNumber}[\\s\\S]*?פרס ראשון[\\s\\S]*?הינו:\\s*([\\d,]+)\\s*₪[\\s\\S]*?סך הזכיות[\\s\\S]*?הינו:\\s*([\\d,]+)\\s*₪`
    );
    const prizeMatch = html.match(prizeRegex);
    const firstPrize = prizeMatch ? parseInt(prizeMatch[1].replace(/,/g, '')) : null;
    const totalPrizes = prizeMatch ? parseInt(prizeMatch[2].replace(/,/g, '')) : null;

    // היסטוריה — כל שאר ההגרלות
    const history = draws.slice(1).map(d => ({ numbers: d.numbers, strong: d.strong }));

    return new Response(JSON.stringify({
      drawNumber: latest.drawNumber,
      date: latest.date,
      numbers: latest.numbers,
      strongNumber: latest.strong,
      firstPrize,
      totalPrizes,
      history,
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
