# LotoIsrael – Dating Coach 🎰

## פריסה ב-5 דקות על Vercel

### שלב 1 – API Key של Anthropic
1. היכנסי ל-[console.anthropic.com](https://console.anthropic.com)
2. צרי חשבון (חינמי)
3. לחצי **API Keys → Create Key**
4. העתיקי את המפתח (מתחיל ב-`sk-ant-...`)

---

### שלב 2 – העלאה ל-GitHub
1. צרי חשבון ב-[github.com](https://github.com) אם אין לך
2. צרי repository חדש: **New → Repository** → שם: `lotoisrael`
3. העלי את כל הקבצים האלה לrepo

---

### שלב 3 – חיבור ל-Vercel
1. היכנסי ל-[vercel.com](https://vercel.com)
2. **Add New Project** → בחרי את ה-repo מ-GitHub
3. לחצי **Deploy** (Vercel מזהה Next.js אוטומטית)

---

### שלב 4 – הכנסת ה-API Key
1. ב-Vercel: **Settings → Environment Variables**
2. הוסיפי:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-...` (המפתח שלך)
3. לחצי **Save**
4. עשי **Redeploy** (Deployments → ••• → Redeploy)

---

### שלב 5 – חיבור הדומיין
1. ב-Vercel: **Settings → Domains**
2. הוסיפי: `lotoisrael.com`
3. ב-DNS של הדומיין שלך הוסיפי את הרשומות שVercel מראה

---

## מבנה הפרויקט

```
lotoisrael/
├── pages/
│   └── api/
│       └── coach.js      ← ה-backend שמדבר עם Anthropic
├── public/
│   └── chat.html         ← עמוד הצ'אט המלא
├── .env.local            ← API key (לא לעלות ל-GitHub!)
├── .gitignore            ← מונע העלאת .env.local
└── package.json
```

## עלויות
- Vercel: **חינמי** עד 100GB bandwidth
- Anthropic: ~$0.003 לשיחה (1,000 שיחות = $3)
