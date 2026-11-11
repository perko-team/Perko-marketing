// The frame every Studio page shares: the top bar with the two pages, the login gate and the toast.
import '@fontsource-variable/heebo';
import '../styles.css';
import { ApiError, DEMO, signIn, signOut, signedIn } from './api';

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;

export const FORMAT: Record<string, string> = { tips: 'טיפים', myth: 'מיתוס או אמת', pov: 'POV', flags: 'דגל אדום, דגל ירוק' };
export const STATUS: Record<string, string> = { scheduled: 'מתוזמן', processing: 'עולה עכשיו', published: 'פורסם', failed: 'נכשל', missed: 'פוספס' };

export function shell(page: 'calendar' | 'stats', start: () => void) {
  const qs = DEMO ? '?demo' : '';
  document.body.insertAdjacentHTML('afterbegin', `
  <header class="top">
    <a class="brand" href="/${qs}"><span class="mark" aria-hidden="true"></span>Perko <span class="sub">סטודיו</span></a>
    <nav class="tabs" aria-label="עמודים">
      <a href="/${qs}" ${page === 'calendar' ? 'aria-current="page"' : ''}>לוח שנה</a>
      <a href="/stats${DEMO ? '.html' : ''}${qs}" ${page === 'stats' ? 'aria-current="page"' : ''}>נתונים</a>
    </nav>
    <div class="top-end"><span class="scope">אינסטגרם <bdi dir="ltr">@getperko</bdi></span>
      <button type="button" class="link" id="signout">יציאה</button></div>
  </header>
  <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>`);
  $('#signout').addEventListener('click', () => { signOut(); location.reload(); });
  if (signedIn()) start();
  else gate(start);
}

function gate(start: () => void) {
  const main = $('main');
  main.hidden = true;
  document.body.classList.add('gated');
  // The punch card is the password meter: each character punches a hole, a correct password fills the card.
  const holes = Array.from({ length: 10 }, (_, i) => `<i class="hole" style="--i:${i}"></i>`).join('');
  main.insertAdjacentHTML('beforebegin', `
  <div class="gate-wrap" id="gate-wrap">
    <section class="gate-art" aria-hidden="true">
      <div class="gcard" id="gcard">
        <div class="gcard-top"><span class="gcard-name">סטודיו הרילסים</span><span class="gcard-mark"><i></i>perko</span></div>
        <div class="gcard-holes">${holes}</div>
        <div class="gcard-foot"><span>שני רילסים ביום</span><span>לוח אחד</span></div>
      </div>
    </section>
    <form class="gate" id="gate" autocomplete="on">
      <h1>הלוח של הרילסים, במקום אחד</h1>
      <p class="lede">כאן מתזמנים את הרילסים של <bdi dir="ltr">@getperko</bdi>, גוררים אותם בין ימים ורואים מה עבד. הסיסמה אצל מי שמנהל את החשבון.</p>
      <label for="pw">סיסמה</label>
      <input id="pw" name="password" type="password" autocomplete="current-password" required>
      <p class="err" id="gate-err" role="alert" hidden></p>
      <button class="btn" type="submit">כניסה לסטודיו</button>
    </form>
  </div>`);
  const form = $<HTMLFormElement>('#gate');
  const pw = $<HTMLInputElement>('#pw');
  const card = $('#gcard');
  const punch = (n: number) => card.querySelectorAll('.hole').forEach((h, i) => h.classList.toggle('on', i < n));
  pw.addEventListener('input', () => { punch(Math.min(10, pw.value.length)); card.classList.remove('nope'); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#gate-err'), btn = $<HTMLButtonElement>('button', form);
    btn.disabled = true; err.hidden = true; btn.textContent = 'בודקים...';
    try {
      await signIn(pw.value);
      punch(10); card.classList.add('full');
      await new Promise((r) => setTimeout(r, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650));
      $('#gate-wrap').remove(); document.body.classList.remove('gated'); main.hidden = false; start();
    } catch (x) {
      const code = x instanceof ApiError ? x.code : '';
      err.textContent = code === 'wrong_password' ? 'הסיסמה לא נכונה. נסו שוב.' : code === 'too_many_attempts' ? 'יותר מדי ניסיונות. נסו שוב בעוד רבע שעה.'
        : code === 'not_configured' ? 'עוד לא הוגדרה סיסמה לסטודיו (STUDIO_PASSWORD ב-Supabase).' : 'אין חיבור לשרת. נסו שוב.';
      err.hidden = false; card.classList.remove('nope'); void card.offsetWidth; card.classList.add('nope'); punch(0); pw.select();
    } finally { btn.disabled = false; btn.textContent = 'כניסה לסטודיו'; }
  });
  pw.focus();
}

let toastTimer = 0;
export function toast(html: string, action?: { label: string; run: () => void }, ms = 6000) {
  const t = $('#toast');
  t.innerHTML = `<span>${html}</span>${action ? `<button type="button" class="link">${esc(action.label)}</button>` : ''}`;
  if (action) $('button', t).addEventListener('click', () => { t.hidden = true; action.run(); });
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { t.hidden = true; }, ms);
}
