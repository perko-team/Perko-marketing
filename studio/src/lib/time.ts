// Everything is shown and scheduled in Jerusalem time, whatever the browser's zone.
export const TZ = 'Asia/Jerusalem';

const parts = (d: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour, mm: +p.minute, ss: +p.second };
};

/** "2026-11-12" of an instant, in Jerusalem */
export const dayKey = (d: Date) => { const p = parts(d); return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`; };
/** "12:30" of an instant, in Jerusalem */
export const hhmm = (d: Date) => { const p = parts(d); return `${String(p.hh).padStart(2, '0')}:${String(p.mm).padStart(2, '0')}`; };

/** The instant that is `time` on `day` in Jerusalem (handles the DST switch). */
export function zoned(day: string, time: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const want = Date.UTC(y, m - 1, d, hh, mm);
  let t = want;
  for (let i = 0; i < 3; i++) {
    const p = parts(new Date(t));
    const got = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm);
    t += want - got;
  }
  return new Date(t);
}

/** Calendar arithmetic on day keys (no time zone involved) */
export const addDays = (key: string, n: number) => {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
};
export const weekday = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }; // 0 = Sunday
export const dayNum = (key: string) => +key.slice(8, 10);
export const monthKey = (key: string) => key.slice(0, 7);

export const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
export const longDay = (key: string) => `יום ${DAYS[weekday(key)]}, ${dayNum(key)} ב${MONTHS[+key.slice(5, 7) - 1]}`;
export const shortDay = (key: string) => `${DAYS[weekday(key)]} ${dayNum(key)}.${+key.slice(5, 7)}`;
