// Data: how the reels do on Instagram, which formats and slots work, follower growth, and what the publisher did.
import { getReels, getStats, type StatRow, type StatsResponse } from './lib/api';
import { $, esc, FORMAT, shell, STATUS } from './lib/shell';
import { dayKey, hhmm, shortDay } from './lib/time';

declare const Charts: any;
const nf = new Intl.NumberFormat('he-IL');
const n = (v: number | null | undefined) => (v == null ? '-' : nf.format(v));
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const EVENTS: Record<string, string> = { published: 'פורסם', failed: 'נכשל', missed: 'פוספס', moved: 'הוזז', container: 'התחיל לעלות', paused: 'הפרסום הושהה', resumed: 'הפרסום חודש', insights_failed: 'משיכת נתונים נכשלה' };

shell('stats', async () => {
  const [s, r] = await Promise.all([getStats(), getReels()]);
  const types = new Map(r.reels.map((x) => [x.id, x.spec.hookType ?? '']));
  render(s, types);
});

const HOOK: Record<string, string> = { list: 'רשימה', symptom: 'סימפטום', mistake: 'טעות', stop: 'עצירה', quiz: 'חידון', pov: 'POV', relatable: 'מזדהים', incomplete: 'משפט פתוח' };

function render(s: StatsResponse, types: Map<string, string>) {
  const pub = s.reels.filter((r) => r.status === 'published').sort((a, b) => Date.parse(a.published_at!) - Date.parse(b.published_at!));
  const measured = pub.filter((r) => r.views != null) as (StatRow & { views: number })[];
  const total = measured.reduce((a, r) => a + r.views, 0);
  const fol = s.followers.filter((f) => f.followers != null) as { day: string; followers: number }[];
  const folNow = fol.at(-1)?.followers ?? null, folFirst = fol[0];
  const folDelta = folNow != null && folFirst ? folNow - folFirst.followers : null;
  const counts = Object.fromEntries(Object.keys(STATUS).map((k) => [k, s.reels.filter((r) => r.status === k).length]));

  $('#finding').innerHTML = measured.length
    ? (() => { const best = measured.reduce((a, b) => (b.views > a.views ? b : a)); return `הרילס החזק עד עכשיו: ״${esc(best.hook)}״ עם ${n(best.views)} צפיות.`; })()
    : pub.length ? 'הנתונים הראשונים מאינסטגרם מגיעים כמה שעות אחרי פרסום.' : `עוד לא פורסם רילס. ${counts.scheduled} מתוזמנים בלוח.`;

  $('#kpis').innerHTML = [
    ['פורסמו', `${n(pub.length)}`, `מתוך ${n(s.reels.length)} בלוח`],
    ['צפיות', measured.length ? n(total) : '-', measured.length ? `ב-${n(measured.length)} רילסים שנמדדו` : 'אין מדידות עדיין'],
    ['ממוצע צפיות לרילס', n(avg(measured.map((r) => r.views))), 'ממוצע של הרילסים שנמדדו'],
    ['עוקבים', n(folNow), folDelta == null ? 'אין מדידות עדיין' : `<bdi dir="ltr">${folDelta > 0 ? '+' : folDelta < 0 ? '−' : ''}${nf.format(Math.abs(folDelta))}</bdi> מאז ${shortDay(folFirst.day)}`],
  ].map(([l, v, c]) => `<div class="kpi"><span class="kl">${l}</span><b>${v}</b><span class="kc">${c}</span></div>`).join('');

  // views per reel, in publish order
  const main = $('#views');
  if (measured.length) {
    Charts.bars(main, { labels: measured.map((r) => shortDay(dayKey(new Date(r.published_at!)))), values: measured.map((r) => r.views), height: 260 });
    $('#views-note').textContent = `${measured.length} רילסים, לפי סדר הפרסום. נמדד לאחרונה ${shortDay(measured.at(-1)!.insights_day!)}.`;
  } else empty(main, 'כשרילסים יפורסמו, כאן יופיעו הצפיות של כל אחד מהם.');

  // formats and slots
  const group = (key: (r: StatRow) => string, label: (k: string) => string) => {
    const m = new Map<string, number[]>();
    for (const r of measured) m.set(key(r), [...(m.get(key(r)) ?? []), r.views]);
    return [...m].map(([k, v]) => ({ label: `${label(k)} (${v.length})`, value: avg(v)! })).sort((a, b) => b.value - a.value);
  };
  const fmts = group((r) => r.format, (k) => FORMAT[k] ?? k);
  fmts.length > 0 ? Charts.barList($('#formats'), fmts, { thin: true }) : empty($('#formats'), 'ההשוואה בין הפורמטים תופיע אחרי שרילסים מכמה פורמטים יימדדו.');
  const hooks = group((r) => types.get(r.id) || 'other', (k) => HOOK[k] ?? 'אחר');
  hooks.length > 0 ? Charts.barList($('#hooks'), hooks, { thin: true }) : empty($('#hooks'), 'כל רילס מסומן בסוג ההוק שלו. כשיהיו מדידות, כאן יופיע איזה סוג מחזיק הכי טוב אצל הקהל שלנו.');
  const slots = group((r) => r.slot, (k) => `${k}`);
  slots.length > 0 ? Charts.barList($('#slots'), slots, { thin: true }) : empty($('#slots'), 'ההשוואה בין 12:30 ל-19:30 תופיע אחרי המדידות הראשונות.');

  // followers
  if (fol.length >= 2) Charts.line($('#followers'), { labels: fol.map((f) => shortDay(f.day)), series: [{ name: 'עוקבים', values: fol.map((f) => f.followers) }], height: 200, endLabel: true });
  else empty($('#followers'), fol.length === 1 ? `${n(fol[0].followers)} עוקבים ב${shortDay(fol[0].day)}. הקו יופיע מהמדידה השנייה.` : 'מספר העוקבים נמדד פעם ביום מרגע שהחשבון מחובר.');

  // publishing status
  $('#status').innerHTML = Object.entries(STATUS).map(([k, v]) => `<li><span class="pill p-${k}">${v}</span><b>${n(counts[k])}</b></li>`).join('');
  $('#events').innerHTML = s.events.length
    ? s.events.slice(0, 8).map((e) => `<li><span>${EVENTS[e.event] ?? esc(e.event)}${e.reel_id ? ` <code>${esc(e.reel_id)}</code>` : ''}</span><time>${shortDay(dayKey(new Date(e.at)))} ${hhmm(new Date(e.at))}</time></li>`).join('')
    : '<li class="muted">עוד אין אירועים.</li>';

  // table
  $('#rows').innerHTML = pub.length ? [...pub].reverse().map((r) => `<tr><td>${shortDay(dayKey(new Date(r.published_at!)))}</td><td>${esc(r.hook)}</td><td>${FORMAT[r.format]}</td><td>${r.slot}</td>
    <td class="num">${n(r.views)}</td><td class="num">${n(r.reach)}</td><td class="num">${n(r.likes)}</td><td class="num">${n(r.saved)}</td><td class="num">${n(r.shares)}</td></tr>`).join('')
    : '<tr><td colspan="9" class="muted">עוד לא פורסמו רילסים.</td></tr>';
}

function empty(el: HTMLElement, text: string) { el.innerHTML = `<div class="empty-chart"><span class="zero"></span><p>${esc(text)}</p></div>`; }
