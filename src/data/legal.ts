// Facts the legal pages and the footer need. Keep them current: they are published on /privacy, /terms and /accessibility.
export const operator = {
  name: 'עילי דינוביץ',
  email: 'hello@getperko.com',
  city: 'ירושלים',
};

export const accessibilityContact = {
  name: operator.name,
  email: operator.email,
};

export const processors = {
  // Where the app's data lives. Check Supabase > Project settings > General > Region.
  supabaseRegion: 'האיחוד האירופי (פרנקפורט, גרמניה)',
  formProvider: 'Resend (שרתים באירלנד), שמעביר את הפרטים באימייל לתיבת הדואר שלנו. הפרטים לא נשמרים במסד נתונים',
  hosting: 'Vercel',
  dm: 'ManyChat, שמחובר לחשבון האינסטגרם של Perko ושומר את פרטי השיחה אצלו',
  email: 'Resend (שרתים באירלנד)',
};

export const minAge = 13;
export const updated = '04.11.2026';

// The Instagram referral game (/race, /race/rules). Fill the dates before the post goes live.
export const raceDates = {
  start: '[למלא: תאריך פרסום הפוסט]',
  end: '[למלא: תאריך סיום, למשל 31.12.2026]',
};
