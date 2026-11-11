// The calendar: every reel on its day; drag one to another day and it publishes then (same time of day).
import { ApiError, getReels, moveReel, setPaused, videoUrl, type Reel, type ReelsResponse } from './lib/api';
import { $, esc, FORMAT, shell, STATUS, toast } from './lib/shell';
import { DAYS, MONTHS, addDays, dayKey, dayNum, hhmm, longDay, monthKey, shortDay, weekday, zoned } from './lib/time';

type View = 'month' | 'week';
const MOVABLE = new Set(['scheduled', 'missed', 'failed']);
const LEAD_MS = 5 * 60e3;
/** For a reel dropped on today after its time has passed: the next whole hour from now (20:00 -> 21:00,
 *  20:10 -> 21:00), or null when no whole hour is left today. */
function nextRoundHour(day: string): string | null {
  if (day !== today()) return null;
  const now = new Date(Date.now() + LEAD_MS);
  const [h, m] = hhmm(now).split(':').map(Number);
  void m;
  const next = h! + 1;
  if (next > 23) return null;
  return `${String(next).padStart(2, '0')}:00`;
}

let data: ReelsResponse | null = null;
let view: View = (() => { try { return (localStorage.getItem('studio-view') as View) || 'month'; } catch { return 'month'; } })();
let anchor = dayKey(new Date()); // a day inside the month or week on screen
let selected: string | null = null;
let suppressClick = false;

const today = () => dayKey(new Date());
const byId = (id: string) => data!.reels.find((r) => r.id === id)!;
const reelDay = (r: Reel) => dayKey(new Date(r.scheduled_at));
const reelTime = (r: Reel) => hhmm(new Date(r.scheduled_at));
const isPhone = () => matchMedia('(max-width: 760px)').matches;

shell('calendar', async () => {
  await load();
  const next = data!.reels.find((r) => r.status === 'scheduled');
  if (next && monthKey(reelDay(next)) !== monthKey(anchor) && view === 'month') anchor = reelDay(next);
  wire();
  render();
  setInterval(() => load().then(render).catch(() => {}), 60e3);
});

async function load() { data = await getReels(); }

// ---------- rendering ----------
function render() {
  if (!data) return;
  renderHead();
  const host = $('#cal');
  host.className = `cal ${isPhone() ? 'agenda' : view}`;
  host.innerHTML = isPhone() ? agenda() : view === 'month' ? month() : week();
  if (selected) drawer(selected); else $('#drawer').hidden = true;
}

function renderHead() {
  const d = data!;
  const first = isPhone() ? today() : view === 'month' ? `${monthKey(anchor)}-01` : weekStart(anchor);
  $('#title').textContent = view === 'week' && !isPhone()
    ? `${dayNum(first)}.${+first.slice(5, 7)} - ${dayNum(addDays(first, 6))}.${+addDays(first, 6).slice(5, 7)}`
    : `${MONTHS[+anchor.slice(5, 7) - 1]} ${anchor.slice(0, 4)}`;
  const next = d.reels.find((r) => r.status === 'scheduled' || r.status === 'processing');
  const missed = d.reels.filter((r) => r.status === 'missed' || r.status === 'failed').length;
  $('#finding').innerHTML = missed
    ? `<b>${missed} ${missed === 1 ? 'רילס פוספס או נכשל' : 'רילסים פוספסו או נכשלו'}.</b> גררו אותם ליום אחר כדי לתזמן מחדש.`
    : next ? `הבא בתור: ${shortDay(reelDay(next))} ב-${reelTime(next)}, ״${esc(next.spec.hook)}״.` : 'אין רילסים מתוזמנים.';
  const st = $('#pubstate');
  if (!d.ig_ready) { st.className = 'pill p-failed'; st.textContent = 'אינסטגרם לא מחובר, שום דבר לא יעלה'; }
  else if (d.paused) { st.className = 'pill p-missed'; st.textContent = 'הפרסום מושהה'; }
  else { st.className = 'pill p-published'; st.textContent = 'פרסום אוטומטי פעיל'; }
  const pb = $<HTMLButtonElement>('#pause');
  pb.textContent = d.paused ? 'חידוש פרסום' : 'השהיית פרסום';
  pb.hidden = !d.ig_ready;
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
}

const weekStart = (key: string) => addDays(key, -weekday(key));

function chip(r: Reel, big = false) {
  const can = MOVABLE.has(r.status);
  return `<button type="button" class="chip s-${r.status}${big ? ' big' : ''}${selected === r.id ? ' sel' : ''}" data-id="${r.id}"
    ${can ? 'data-drag="1"' : ''} aria-label="${esc(r.spec.hook)}, ${reelTime(r)}, ${STATUS[r.status]}${can ? '. אפשר לגרור ליום אחר' : ''}">
    ${r.cover_url ? `<img src="${esc(r.cover_url)}" alt="" draggable="false" loading="lazy">` : '<span class="noimg"></span>'}
    <span class="cbody"><span class="ctime">${reelTime(r)}<i class="dot d-${r.status}" title="${STATUS[r.status]}"></i></span>
    <span class="chook">${esc(r.spec.hook)}</span>${big ? `<span class="cfmt">${FORMAT[r.spec.format]}</span>` : ''}</span></button>`;
}

function dayCell(key: string, opts: { outside?: boolean; big?: boolean } = {}) {
  const reels = data!.reels.filter((r) => reelDay(r) === key);
  const t = today();
  const cls = ['day', key < t ? 'past' : '', key === t ? 'today' : '', opts.outside ? 'outside' : '', weekday(key) === 6 ? 'sat' : ''].filter(Boolean).join(' ');
  return `<div class="${cls}" data-day="${key}" role="gridcell" aria-label="${longDay(key)}">
    <div class="dhead"><span class="dn">${dayNum(key)}</span></div>
    <div class="chips">${reels.map((r) => chip(r, opts.big)).join('')}</div></div>`;
}

function month() {
  const first = `${monthKey(anchor)}-01`;
  let k = weekStart(first);
  const cells: string[] = [];
  do { for (let i = 0; i < 7; i++) { cells.push(dayCell(k, { outside: monthKey(k) !== monthKey(anchor) })); k = addDays(k, 1); } }
  while (monthKey(k) === monthKey(anchor));
  return `<div class="wd" role="row">${DAYS.map((d) => `<span role="columnheader">${d}</span>`).join('')}</div><div class="grid" role="grid">${cells.join('')}</div>`;
}

function week() {
  const s = weekStart(anchor);
  return `<div class="wd" role="row">${DAYS.map((d) => `<span role="columnheader">${d}</span>`).join('')}</div>
    <div class="grid" role="grid">${Array.from({ length: 7 }, (_, i) => dayCell(addDays(s, i), { big: true })).join('')}</div>`;
}

function agenda() {
  const t = today();
  const keys = [...new Set(data!.reels.map(reelDay))].filter((k) => k >= addDays(t, -2)).sort();
  if (!keys.length) return '<p class="empty">אין רילסים בלוח מהיום והלאה.</p>';
  return keys.map((k) => `<section class="aday${k === t ? ' today' : ''}" data-day="${k}"><h2>${longDay(k)}</h2>
    <div class="chips">${data!.reels.filter((r) => reelDay(r) === k).map((r) => chip(r)).join('')}</div></section>`).join('');
}

// ---------- the drawer ----------
function drawer(id: string) {
  const r = byId(id);
  const d = $('#drawer');
  const can = MOVABLE.has(r.status);
  const s = r.spec;
  d.innerHTML = `
  <div class="dr-head"><h2>${esc(s.hook)} <span>${esc(s.hookAccent)}</span></h2><button type="button" class="icon" id="dr-close" aria-label="סגירה">×</button></div>
  <div class="dr-media">${r.cover_url ? `<img src="${esc(r.cover_url)}" alt="כיסוי ${r.id}">` : '<span class="noimg">אין כיסוי</span>'}
    ${r.has_video ? '<button type="button" class="btn ghost play" id="dr-play">הפעלת הסרטון</button>' : ''}</div>
  <div class="dr-meta"><span class="pill p-${r.status}">${STATUS[r.status]}</span><span>${FORMAT[s.format]}</span><code>${r.id}</code></div>
  ${r.error ? `<p class="dr-err">${esc(r.status === 'missed' ? 'הזמן עבר לפני שהרילס עלה. בחרו מועד חדש.' : r.error)}</p>` : ''}
  ${r.permalink ? `<a class="btn ghost" href="${esc(r.permalink)}" target="_blank" rel="noopener">פתיחה באינסטגרם</a>` : ''}
  <form class="dr-when" id="dr-when">
    <div><label for="dr-day">תאריך</label><input id="dr-day" type="date" value="${reelDay(r)}" min="${today()}" ${can ? '' : 'disabled'}></div>
    <div><label for="dr-time">שעה</label><input id="dr-time" type="time" step="300" value="${reelTime(r)}" ${can ? '' : 'disabled'}></div>
    <button class="btn" type="submit" ${can ? '' : 'disabled'}>שמירת מועד</button>
  </form>
  <p class="dr-note">${can ? `יעלה ב${longDay(reelDay(r))} בשעה ${reelTime(r)}, שעון ישראל.` : r.status === 'published' ? `עלה ב${longDay(dayKey(new Date(r.published_at!)))} בשעה ${hhmm(new Date(r.published_at!))}.` : 'הרילס עולה עכשיו ואי אפשר להזיז אותו.'}</p>
  <h3>על המסך</h3>
  <ol class="dr-items">${s.items.map((i) => `<li><b>${esc(i.title)}</b>${i.body ? ' ' + esc(i.body) : ''}${i.tag ? ` <span class="flag f-${i.tag}">${i.tag === 'green' ? 'ירוק' : 'אדום'}</span>` : ''}</li>`).join('')}</ol>
  <h3>כיתוב</h3>
  <div class="dr-cap"><p>${esc(s.caption)}</p><p class="tags">${s.hashtags.map((t) => `<bdi dir="auto">${esc(t)}</bdi>`).join(' ')}</p></div>
  <button type="button" class="btn ghost" id="dr-copy">העתקת כיתוב</button>`;
  d.hidden = false;
  $('#dr-close', d).addEventListener('click', () => { selected = null; d.hidden = true; markSelected(); });
  $('#dr-copy', d).addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    try { await navigator.clipboard.writeText(`${s.caption}\n\n${s.hashtags.join(' ')}`); b.textContent = 'הועתק'; } catch { b.textContent = 'לא הועתק'; }
    setTimeout(() => { b.textContent = 'העתקת כיתוב'; }, 1600);
  });
  $('#dr-play', d)?.addEventListener('click', async () => {
    const { url } = await videoUrl(r.id).catch(() => ({ url: null }));
    if (!url) return toast('אי אפשר לטעון את הסרטון כרגע.');
    $('.dr-media', d).innerHTML = `<video src="${esc(url)}" controls autoplay playsinline poster="${esc(r.cover_url ?? '')}"></video>`;
  });
  $<HTMLFormElement>('#dr-when', d).addEventListener('submit', (e) => {
    e.preventDefault();
    move(r.id, $<HTMLInputElement>('#dr-day', d).value, $<HTMLInputElement>('#dr-time', d).value);
  });
}

function markSelected() { document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('sel', (c as HTMLElement).dataset.id === selected)); }

// ---------- moving ----------
async function move(id: string, day: string, time: string, undo = false) {
  const r = byId(id);
  const before = r.scheduled_at;
  let when = zoned(day, time);
  let bumped = false;
  if (when.getTime() < Date.now() + LEAD_MS) {
    const nh = nextRoundHour(day);
    if (!nh) return toast(day === today() ? 'לא נשארו היום שעות לפרסום. בחרו יום אחר.' : 'אי אפשר לתזמן ליום שכבר עבר.');
    time = nh; when = zoned(day, time); bumped = true;
  }
  if (when.toISOString() === new Date(before).toISOString()) return;
  const prevStatus = r.status;
  r.scheduled_at = when.toISOString(); r.status = 'scheduled';
  render();
  try {
    await moveReel(id, r.scheduled_at);
    const clash = data!.reels.some((x) => x.id !== id && reelDay(x) === day && reelTime(x) === time);
    if (undo) return toast(`הוחזר ל${longDay(day)} ב-${time}.`);
    toast(`״${esc(r.spec.hook)}״ יעלה ב${longDay(day)} ב-${time}.${bumped ? ' השעה המקורית כבר עברה, אז הוא עבר לשעה העגולה הבאה.' : ''}${clash ? ' שימו לב: יש עוד רילס באותה שעה.' : ''}`,
      Date.parse(before) > Date.now() + LEAD_MS ? { label: 'ביטול', run: () => move(id, dayKey(new Date(before)), hhmm(new Date(before)), true) } : undefined);
  } catch (e) {
    r.scheduled_at = before; r.status = prevStatus; render();
    const code = e instanceof ApiError ? e.code : '';
    toast(code === 'in_the_past' ? 'אי אפשר לתזמן לזמן שכבר עבר.' : code === 'locked' ? 'הרילס כבר עולה או פורסם, אי אפשר להזיז אותו.' : 'השינוי לא נשמר. בדקו את החיבור ונסו שוב.');
  }
}

// ---------- pointer drag (mouse, pen and touch with a long press) ----------
function wire() {
  $('#prev').addEventListener('click', () => step(-1));
  $('#next').addEventListener('click', () => step(1));
  $('#today').addEventListener('click', () => { anchor = today(); render(); });
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.addEventListener('click', () => {
    view = b.dataset.view as View; try { localStorage.setItem('studio-view', view); } catch { /* ignore */ } render();
  }));
  $('#pause').addEventListener('click', async () => {
    const p = !data!.paused;
    try { await setPaused(p); data!.paused = p; renderHead(); toast(p ? 'הפרסום האוטומטי הושהה. שום רילס לא יעלה עד שתחדשו.' : 'הפרסום האוטומטי חודש.'); }
    catch { toast('השינוי לא נשמר. נסו שוב.'); }
  });
  addEventListener('resize', () => render());
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && selected) { selected = null; $('#drawer').hidden = true; markSelected(); } });

  const cal = $('#cal');
  cal.addEventListener('click', (e) => {
    if (suppressClick) { suppressClick = false; return; }
    const c = (e.target as Element).closest<HTMLElement>('.chip');
    if (!c) return;
    selected = c.dataset.id!; markSelected(); drawer(selected);
  });

  let drag: { id: string; el: HTMLElement; ghost?: HTMLElement; x: number; y: number; pid: number; timer?: number; live: boolean; over?: HTMLElement | null } | null = null;
  const begin = () => {
    if (!drag) return;
    drag.live = true;
    const g = drag.el.cloneNode(true) as HTMLElement;
    const box = drag.el.getBoundingClientRect();
    g.classList.add('ghost'); g.style.width = `${box.width}px`;
    document.body.append(g); drag.ghost = g;
    drag.el.classList.add('lifting'); document.body.classList.add('dragging');
    place(drag.x, drag.y);
  };
  const place = (x: number, y: number) => {
    if (!drag?.ghost) return;
    drag.ghost.style.transform = `translate(${x - drag.ghost.offsetWidth / 2}px, ${y - 24}px)`;
    drag.ghost.style.visibility = 'hidden';
    const cell = (document.elementFromPoint(x, y) as Element | null)?.closest<HTMLElement>('[data-day]') ?? null;
    drag.ghost.style.visibility = '';
    if (drag.over && drag.over !== cell) drag.over.classList.remove('drop-ok', 'drop-no');
    if (cell) {
      const ok = zoned(cell.dataset.day!, reelTime(byId(drag.id))).getTime() > Date.now() + LEAD_MS || nextRoundHour(cell.dataset.day!) != null;
      cell.classList.toggle('drop-ok', ok); cell.classList.toggle('drop-no', !ok);
    }
    drag.over = cell;
  };
  const end = (drop: boolean) => {
    if (!drag) return;
    clearTimeout(drag.timer);
    const d = drag; drag = null;
    d.ghost?.remove(); d.el.classList.remove('lifting'); document.body.classList.remove('dragging');
    d.over?.classList.remove('drop-ok', 'drop-no');
    if (d.live) {
      suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
      const r = byId(d.id);
      if (drop && d.over && d.over.dataset.day !== reelDay(r)) move(d.id, d.over.dataset.day!, reelTime(r));
    }
  };
  cal.addEventListener('pointerdown', (e) => {
    const el = (e.target as Element).closest<HTMLElement>('.chip[data-drag]');
    if (!el || e.button !== 0) return;
    drag = { id: el.dataset.id!, el, x: e.clientX, y: e.clientY, pid: e.pointerId, live: false };
    if (e.pointerType === 'touch') drag.timer = window.setTimeout(() => { if (drag) { begin(); navigator.vibrate?.(15); } }, 380);
  });
  addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!drag.live) {
      const far = Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6;
      if (far && e.pointerType === 'touch') { clearTimeout(drag.timer); drag = null; return; } // a scroll, not a drag
      if (far) begin(); else return;
    }
    e.preventDefault();
    drag.x = e.clientX; drag.y = e.clientY; place(e.clientX, e.clientY);
  }, { passive: false });
  addEventListener('pointerup', (e) => { if (drag && e.pointerId === drag.pid) end(true); });
  addEventListener('pointercancel', () => end(false));
  addEventListener('touchmove', (e) => { if (drag?.live) e.preventDefault(); }, { passive: false });
}

function step(n: number) {
  if (view === 'month' && !isPhone()) {
    const [y, m] = anchor.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1 + n, 1));
    anchor = t.toISOString().slice(0, 10);
  } else anchor = addDays(anchor, 7 * n);
  render();
}
