# המרוץ לכרטיס הזהב - הפעלה

מה כבר מוכן: הטבלה race_players ב-Supabase (פרויקט perko), העמודים /race, /r/<קוד>, /race/rules, וה-API /api/race.

## 1. Vercel - משתני סביבה
Project > Settings > Environment Variables (Production):
- `SUPABASE_URL` - הכתובת של פרויקט perko (Supabase > Project Settings > API).
- `SUPABASE_SERVICE_ROLE_KEY` - המפתח service_role מאותו מסך. סודי, רק ב-Vercel.
- `RACE_SECRET` - מחרוזת אקראית ארוכה (לפחות 24 תווים). אפשר לייצר ב: `openssl rand -hex 24`. אותה מחרוזת נכנסת גם ל-ManyChat.
- `RACE_OPEN` = `1` כשהמרוץ פתוח. כל ערך אחר סוגר הצטרפויות חדשות.
אחרי השמירה: Redeploy.

## 2. תקנון
ב-`src/data/legal.ts` למלא את `raceDates.start` ו-`raceDates.end`.

## 3. ManyChat (חשבון Pro, בשביל External Request)
חיבור: ManyChat > Settings > Instagram > לחבר את החשבון getperko.

שדות מותאמים (Settings > Fields > User Fields): `race_ref` (Text), `race_code` (Text), `race_link` (Text), `race_stamps` (Number).

### אוטומציה א: תגובה על הפוסט
- טריגר: Instagram > User comments on your Post or Reel > הפוסט של המרוץ > מילת מפתח ״אני בפנים״.
- תגובה ציבורית אוטומטית (אופציונלי): ״שלחנו לך הודעה 💌״.
- הודעה פרטית: ״היי! איזה שם לכתוב על הכרטיס שלך? (שם פרטי בלבד)״ עם User Input שנשמר ל-First Name.
- המשך ל-״פעולת הצטרפות״ (למטה).

### אוטומציה ב: מי שהגיע מקישור של חבר
- טריגר: Instagram > Ref URL. ManyChat מייצר קישור בסגנון ig.me/m/getperko?ref=...
  הקישור באתר שולח ref בצורה `r_<קוד>`. ב-ManyChat מגדירים ב-Ref URL שמירה של ה-payload לשדה `race_ref`.
- אחר כך אותה שאלה על השם, ואותה ״פעולת הצטרפות״.

### פעולת הצטרפות (External Request)
- POST `https://www.getperko.com/api/race`
- Headers: `Authorization: Bearer <RACE_SECRET>` , `Content-Type: application/json`
- Body:
  `{"id":"{{contact id}}","username":"{{instagram username}}","name":"{{first name}}","ref":"{{race_ref}}"}`
- Response mapping: `$.code` -> race_code, `$.link` -> race_link, `$.stamps` -> race_stamps.
- הודעה אחרי ההצלחה:
  ״הכרטיס שלך מוכן ✨ {{race_link}}
  שלחו את הקישור לחברים. כל חבר שמצטרף דרכו = חותמת. מי שמשלים 10 ראשון זוכה בכרטיס הזהב 0001.
  תקנון: getperko.com/race/rules״
- אם התשובה כוללת `"error":"closed"`: ״המרוץ סגור כרגע, נעדכן כשייפתח.״

## 4. בדיקה לפני הפוסט
1. מחשבון בדיקה: לכתוב ״אני בפנים״ על פוסט בדיקה, לוודא שמגיע קישור ושהכרטיס נפתח.
2. מחשבון בדיקה שני: לפתוח את הקישור של הראשון וללחוץ ״אני בפנים, להצטרפות״, לוודא שלראשון נוספה חותמת.
3. למחוק את שורות הבדיקה ב-Supabase > Table Editor > race_players.

## ניהול בזמן המרוץ
- פסילה: race_players > disqualified = true.
- הסטורי השבועי: צילום מסך של getperko.com/race.
- סוף המרוץ: RACE_OPEN != 1, ואחרי 90 יום למחוק את הטבלה חוץ מהזוכה (כמו שכתוב בתקנון).
