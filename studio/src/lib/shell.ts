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
  document.body.insertAdjacentHTML('beforeend', `
  <form class="gate card" id="gate" autocomplete="on">
    <h1>כניסה לסטודיו</h1>
    <p>לוח הפרסומים של הרילס של Perko. הסיסמה נמצאת אצל מי שמנהל את החשבון.</p>
    <label for="pw">סיסמה</label>
    <input id="pw" name="password" type="password" autocomplete="current-password" required>
    <p class="err" id="gate-err" hidden></p>
    <button class="btn" type="submit">כניסה</button>
  </form>`);
  const form = $<HTMLFormElement>('#gate');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#gate-err'), btn = $<HTMLButtonElement>('button', form);
    btn.disabled = true; err.hidden = true;
    try {
      await signIn($<HTMLInputElement>('#pw').value);
      form.remove(); main.hidden = false; start();
    } catch (x) {
      const code = x instanceof ApiError ? x.code : '';
      err.textContent = code === 'wrong_password' ? 'הסיסמה לא נכונה.' : code === 'too_many_attempts' ? 'יותר מדי ניסיונות. נסו שוב בעוד רבע שעה.'
        : code === 'not_configured' ? 'עוד לא הוגדרה סיסמה לסטודיו (STUDIO_PASSWORD ב-Supabase).' : 'אין חיבור לשרת. נסו שוב.';
      err.hidden = false;
    } finally { btn.disabled = false; }
  });
  $<HTMLInputElement>('#pw').focus();
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
