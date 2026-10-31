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
  email: 'Resend (שרתים באירלנד)',
};

export const minAge = 13;
export const updated = '31.10.2026';
