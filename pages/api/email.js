// pages/api/email.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return res.status(500).json({ error: 'No Resend key' });

  const { to, name, sessionNum, sessionTitle, lang = 'he', action } = req.body;

  // ── ADD CONTACT to Resend Audience ──
  if (action === 'add_contact') {
    if (!to || !name) return res.status(400).json({ error: 'Missing fields' });
    try {
      // Get or create audience
      const audRes = await fetch('https://api.resend.com/audiences', {
        headers: { 'Authorization': `Bearer ${RESEND_KEY}` }
      });
      const audData = await audRes.json();
      let audienceId = audData.data?.[0]?.id;

      if (!audienceId) {
        const createAud = await fetch('https://api.resend.com/audiences', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'LotoIsrael Users' })
        });
        const newAud = await createAud.json();
        audienceId = newAud.id;
      }

      if (audienceId) {
        await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: to, first_name: name, unsubscribed: false, data: { language: lang } })
        });
      }
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(200).json({ ok: false, note: e.message }); // non-fatal
    }
  }

  // ── SEND SESSION EMAIL ──
  if (!to || !sessionNum) return res.status(400).json({ error: 'Missing fields' });

  const isHe = lang === 'he';
  const url = `https://www.lotoisrael.com${lang === 'en' ? '?lang=en' : ''}`;
  const subject = isHe
    ? `🎰 לוטו ישראל – שיעור ${sessionNum}: ${sessionTitle}`
    : `🎰 LotoIsrael – Session ${sessionNum}: ${sessionTitle}`;

  const pct = Math.round((sessionNum / 11) * 100);

  const html = isHe ? `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0C0B09;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="text-align:center;margin-bottom:28px">
      <span style="font-size:28px;font-weight:900;color:#FFD700">Loto</span><span style="font-size:28px;font-weight:900;color:#E8232A">Israel</span>
    </div>
    <div style="background:#161310;border-radius:16px;padding:28px;border:1px solid rgba(255,255,255,0.08)">
      <h1 style="color:white;font-size:20px;margin:0 0 8px">היי ${name}! 👋</h1>
      <p style="color:#E8D4B4;font-size:15px;line-height:1.7;margin:0 0 20px">
        הגיע הזמן לשיעור <strong style="color:#FFD700">${sessionNum}</strong> שלנו.<br>
        הנושא: <strong style="color:#FFD700">${sessionTitle}</strong>
      </p>
      <div style="background:rgba(232,35,42,0.1);border:1px solid rgba(232,35,42,0.25);border-radius:12px;padding:16px;margin-bottom:24px">
        <p style="color:#FF9098;font-size:13px;margin:0 0 6px;font-weight:600">שיעור ${sessionNum} מתוך 11</p>
        <div style="height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:linear-gradient(to left,#FFD700,#E8232A);border-radius:3px"></div>
        </div>
        <p style="color:#7A6B58;font-size:11px;margin:6px 0 0">${pct}% הושלם</p>
      </div>
      <a href="${url}" style="display:block;background:#E8232A;color:white;text-align:center;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;margin-bottom:16px">
        המשך את השיעור 🎰
      </a>
      <p style="color:#3A3025;font-size:11px;text-align:center;margin:0">לביטול הרשמה <a href="mailto:Info@lotoisrael.com?subject=unsubscribe" style="color:#3A3025">לחץ כאן</a></p>
    </div>
    <p style="color:#3A3025;font-size:11px;text-align:center;margin-top:16px">LotoIsrael · <a href="mailto:Info@lotoisrael.com" style="color:#3A3025">Info@lotoisrael.com</a></p>
  </div>
</body>
</html>` : `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0C0B09;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="text-align:center;margin-bottom:28px">
      <span style="font-size:28px;font-weight:900;color:#FFD700">Loto</span><span style="font-size:28px;font-weight:900;color:#E8232A">Israel</span>
    </div>
    <div style="background:#161310;border-radius:16px;padding:28px;border:1px solid rgba(255,255,255,0.08)">
      <h1 style="color:white;font-size:20px;margin:0 0 8px">Hey ${name}! 👋</h1>
      <p style="color:#E8D4B4;font-size:15px;line-height:1.7;margin:0 0 20px">
        Time for session <strong style="color:#FFD700">${sessionNum}</strong>!<br>
        Topic: <strong style="color:#FFD700">${sessionTitle}</strong>
      </p>
      <div style="background:rgba(232,35,42,0.1);border:1px solid rgba(232,35,42,0.25);border-radius:12px;padding:16px;margin-bottom:24px">
        <p style="color:#FF9098;font-size:13px;margin:0 0 6px;font-weight:600">Session ${sessionNum} of 11</p>
        <div style="height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:linear-gradient(to right,#E8232A,#FFD700);border-radius:3px"></div>
        </div>
        <p style="color:#7A6B58;font-size:11px;margin:6px 0 0">${pct}% complete</p>
      </div>
      <a href="${url}" style="display:block;background:#E8232A;color:white;text-align:center;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;margin-bottom:16px">
        Continue Session 🎰
      </a>
      <p style="color:#3A3025;font-size:11px;text-align:center;margin:0">To unsubscribe <a href="mailto:Info@lotoisrael.com?subject=unsubscribe" style="color:#3A3025">click here</a></p>
    </div>
    <p style="color:#3A3025;font-size:11px;text-align:center;margin-top:16px">LotoIsrael · <a href="mailto:Info@lotoisrael.com" style="color:#3A3025">Info@lotoisrael.com</a></p>
  </div>
</body>
</html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'LotoIsrael <Info@lotoisrael.com>', to: [to], subject, html }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data });
    return res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
