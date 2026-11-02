// The neighbourhood love map (/love): reads the vote summary from /api/love, sizes the pins and the board,
// and sends one vote at a time. Works without the API too: the map and the list still show, with no counts.
import listed from '../data/love-businesses.json';

type Biz = { key: string; name: string; street: string; votes: number };
type Summary = { businesses: Biz[]; reasons: { name: string; reason: string }[]; total: number };

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));
const STREET: Record<string, string> = { emek: 'עמק רפאים', beitlehem: 'דרך בית לחם', other: 'בשכונה' };

const form = $<HTMLFormElement>('[data-love-form]');
const select = $<HTMLSelectElement>('[data-love-select]');
const msg = $('[data-love-msg]');
let state: Summary = { businesses: [], reasons: [], total: 0 };

function merged(): Biz[] {
  const votes = new Map(state.businesses.map((b) => [b.key, b]));
  const all: Biz[] = listed.map((b) => ({ ...b, votes: votes.get(b.key)?.votes ?? 0 }));
  for (const b of state.businesses) if (!all.some((a) => a.key === b.key)) all.push({ ...b, votes: Number(b.votes) });
  return all.sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, 'he'));
}

function render() {
  const all = merged();
  const max = Math.max(1, ...all.map((b) => b.votes));
  for (const g of $$<SVGGElement>('[data-pin]')) {
    const v = all.find((b) => b.key === g.dataset.pin)?.votes ?? 0;
    const r = v ? 10 + 16 * Math.sqrt(v / max) : 7;
    $<SVGCircleElement>('.lv-pin__dot', g)!.setAttribute('r', String(r));
    $<SVGCircleElement>('.lv-pin__halo', g)!.setAttribute('r', String(r + 9));
    $('[data-count]', g)!.textContent = v && r >= 14 ? String(v) : '';
    const label = $<SVGTextElement>('.lv-pin__label', g)!;
    const odd = label.getAttribute('text-anchor') === 'start';
    label.setAttribute('x', String((odd ? -1 : 1) * (r + 7)));
    g.classList.toggle('is-zero', !v);
  }

  const total = $('[data-total]');
  if (total) total.textContent = state.total ? `${state.total.toLocaleString('he-IL')} קולות עד עכשיו` : '';

  const board = $('[data-board]');
  if (board) {
    const top = all.filter((b) => b.votes).slice(0, 10);
    const rows = (top.length ? top : all.slice(0, 6)).map((b, i) => {
      const li = document.createElement('li');
      const rank = Object.assign(document.createElement('span'), { className: 'lv-board__rank', textContent: String(i + 1) });
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = b.name;
      btn.append(Object.assign(document.createElement('span'), { className: 'lv-board__street', textContent: STREET[b.street] ?? '' }));
      btn.addEventListener('click', () => pick(b.key, true));
      const votes = Object.assign(document.createElement('span'), { className: 'lv-board__votes', textContent: String(b.votes) });
      const bar = Object.assign(document.createElement('span'), { className: 'lv-board__bar' });
      const fill = document.createElement('span');
      bar.append(fill);
      li.append(rank, btn, votes, bar);
      requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = `${(b.votes / max) * 100}%`; }));
      return li;
    });
    board.replaceChildren(...rows);
    if (!top.length) {
      const note = Object.assign(document.createElement('li'), { className: 'small muted', textContent: 'עוד אין קולות. הקול הראשון יכול להיות שלכם.' });
      board.prepend(note);
    }
  }

  const wrap = $('[data-reasons-wrap]');
  const list = $('[data-reasons]');
  if (wrap && list) {
    wrap.hidden = !state.reasons.length;
    list.replaceChildren(...state.reasons.map((r) => {
      const li = document.createElement('li');
      li.append(Object.assign(document.createElement('q'), { textContent: r.reason }), Object.assign(document.createElement('b'), { textContent: r.name }));
      return li;
    }));
  }
}

function pick(key: string, scroll = false) {
  $$('[data-pin]').forEach((g) => g.classList.toggle('is-picked', g.dataset.pin === key));
  if (select && [...select.options].some((o) => o.value === key)) {
    select.value = key;
    select.dispatchEvent(new Event('change'));
    if (scroll) {
      form?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      select.focus({ preventScroll: true });
    }
  }
}

async function load() {
  try {
    const res = await fetch('/api/love', { headers: { Accept: 'application/json' } });
    if (res.ok) state = await res.json();
  } catch { /* offline or not configured: the map still shows */ }
  render();
}

function initForm() {
  if (!form || !select) return;
  const other = $('[data-other]', form)!;
  const otherInput = $<HTMLInputElement>('input[name=name]', form)!;
  const reason = $<HTMLTextAreaElement>('textarea[name=reason]', form)!;
  const count = $('[data-reason-count]', form)!;
  const done = $('[data-love-done]', form)!;
  const submit = $<HTMLButtonElement>('button[type=submit]', form)!;
  const fields = $$('.lv-field, .lv-submit, .lv-fine', form);

  select.addEventListener('change', () => {
    other.hidden = select.value !== 'other';
    $$('[data-pin]').forEach((g) => g.classList.toggle('is-picked', g.dataset.pin === select.value));
  });
  reason.addEventListener('input', () => { count.textContent = `${reason.value.length}/140`; });
  $$<SVGGElement>('[data-pin]').forEach((g) => g.addEventListener('click', () => pick(g.dataset.pin!, true)));

  const show = (doneState: boolean) => {
    fields.forEach((f) => { f.hidden = doneState; });
    if (!doneState) other.hidden = select.value !== 'other';
    done.hidden = !doneState;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg!.textContent = '';
    if (!select.value) { msg!.textContent = 'בחרו עסק מהרשימה.'; select.focus(); return; }
    if (select.value === 'other' && otherInput.value.trim().length < 2) { msg!.textContent = 'כתבו את שם העסק.'; otherInput.focus(); return; }
    submit.disabled = true;
    try {
      const res = await fetch('/api/love', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: select.value,
          name: otherInput.value,
          reason: reason.value,
          website: ($<HTMLInputElement>('input[name=website]', form)!).value,
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.status === 429) { msg!.textContent = 'הגעתם למכסת ההצבעות להיום. תודה על האהבה, נתראה מחר.'; return; }
      if (res.status === 503) { msg!.textContent = 'ההצבעה עוד לא פתוחה. נסו שוב בקרוב.'; return; }
      if (!res.ok || !out.ok) { msg!.textContent = 'משהו השתבש. נסו שוב בעוד רגע.'; return; }

      const listedHit = listed.find((b) => b.key === select.value);
      if (listedHit) {
        const cur = state.businesses.find((b) => b.key === listedHit.key);
        if (cur) cur.votes = Number(cur.votes) + 1;
        else state.businesses.push({ ...listedHit, votes: 1 });
      }
      state.total += 1;
      render();
      const notes = [];
      if (!listedHit) notes.push('העסק יופיע במפה אחרי שנעבור על השם.');
      if (reason.value.trim()) notes.push('הנימוק שלכם יופיע אחרי שנעבור עליו.');
      $('[data-love-done-note]', form)!.textContent = notes.join(' ');
      show(true);
      $<HTMLButtonElement>('[data-love-share]', form)?.focus();
    } catch {
      msg!.textContent = 'אין חיבור כרגע. נסו שוב בעוד רגע.';
    } finally {
      submit.disabled = false;
    }
  });

  $('[data-love-again]', form)?.addEventListener('click', () => {
    form.reset();
    count.textContent = '0/140';
    show(false);
    select.focus();
  });

  $('[data-love-share]', form)?.addEventListener('click', async () => {
    const data = { title: 'מפת האהבה של השכונה', text: 'איזה עסק בעמק רפאים ובדרך בית לחם אתם הכי אוהבים? הצביעו כאן:', url: location.origin + '/love' };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(`${data.text} ${data.url}`);
      msg!.textContent = 'הקישור הועתק. אפשר להדביק בקבוצה של הבניין.';
    } catch { /* share sheet closed */ }
  });
}

initForm();
load();
