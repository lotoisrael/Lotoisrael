// pages/api/coach.js
// This runs on the SERVER - the API key is never exposed to the browser

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM = {
  he: `אתה מאמן דייטינג וזוגיות אישי חם, שובב ואנושי של LotoIsrael.
המטרה שלך: לנהל שיחת היכרות קצרה עם משתמש חדש כדי להבין מי הוא ומה הוא מחפש.
שאל בדיוק 5 שאלות, אחת בכל פעם, בסדר הזה:
1. מה המצב הזוגי שלהם עכשיו
2. מה הכי חשוב להם בבן/בת זוג (בקש 2-3 דברים)
3. מה לדעתם עצר אותם מזוגיות עד עכשיו
4. מה הם רוצים לשפר בעצמם
5. כמה הם בנוח על דייט ראשון (בקש ציון 1-10)

חוקים קשיחים:
- שאלה אחת בכל פעם. אל תשאל כמה שאלות יחד.
- תגובות קצרות וחמות (2-4 משפטים מקסימום)
- תגיב על מה שאמרו לפני שאתה שואל את השאלה הבאה
- אחרי שאלה 5, אמור בדיוק: "DONE"
- אל תציע עצות עדיין - זה שלב ההיכרות בלבד
- דבר בעברית תקינה, חמה, לא פורמלית`,

  en: `You are a warm, playful, human dating and relationship coach for LotoIsrael.
Your goal: conduct a short onboarding interview with a new user to understand who they are.
Ask exactly 5 questions, one at a time, in this order:
1. Their current relationship status
2. What matters most to them in a partner (ask for 2-3 things)
3. What they think has held them back from a relationship
4. What they want to improve about themselves
5. How comfortable they are on a first date (ask for a score 1-10)

Strict rules:
- One question at a time. Never ask multiple questions together.
- Short warm responses (2-4 sentences max)
- Acknowledge what they said before asking the next question
- After question 5, say exactly: "DONE"
- Don't give advice yet - this is the getting-to-know-you phase only
- Speak in natural, warm, informal English`,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, lang = 'he' } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing messages' });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: SYSTEM[lang] || SYSTEM.he,
      messages,
    });

    const reply = response.content[0]?.text || '';
    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Anthropic error:', error);
    return res.status(500).json({ error: 'Coach unavailable', details: error.message });
  }
}
