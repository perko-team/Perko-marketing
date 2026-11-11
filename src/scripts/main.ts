import { initDepth, initStampTrail } from './depth';
import { initJourney } from './journey';
// Page behaviour: menu, entrances, the two scroll stories, the demo, the FAQ and the interest form.

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* Mobile menu */
function initMenu() {
  const toggle = $<HTMLButtonElement>('[data-menu-toggle]');
  const menu = $('[data-menu]');
  const label = $('[data-menu-label]');
  if (!toggle || !menu) return;
  const set = (open: boolean) => {
    toggle.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? 'סגירת תפריט' : 'פתיחת תפריט';
    menu.hidden = !open;
    menu.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) $<HTMLAnchorElement>('a', menu)?.focus();
  };
  toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('[data-menu-link]', menu).forEach((a) => a.addEventListener('click', () => set(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { set(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) set(false); });
}

/* Entrances, once */
function initReveal() {
  const els = $$('[data-reveal]');
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  els.forEach((el) => io.observe(el));
}

/* Progress of a tall section through its sticky stage, 0..1 */
function progressOf(section: HTMLElement) {
  const r = section.getBoundingClientRect();
  const run = r.height - window.innerHeight;
  return run <= 0 ? 1 : clamp(-r.top / run);
}

/* Scattered cards converge into one Perko list */
function initConverge() {
  const section = $('[data-converge]');
  if (!section) return;
  if (reduce.matches) { section.classList.add('is-static'); return; }
  const frags = $$('[data-frag]', section);
  const measure = () => {
    section.style.setProperty('--p', '0');
    for (const f of frags) {
      const row = $(`[data-row="${f.dataset.frag}"]`, section);
      if (!row) continue;
      const a = f.getBoundingClientRect();
      // The wallet is offset while hidden; measure its resting place.
      const b = row.getBoundingClientRect();
      const wallet = row.closest<HTMLElement>('.wallet');
      const shift = wallet ? 40 : 0;
      f.style.setProperty('--tx', `${b.left + b.width / 2 - (a.left + a.width / 2)}px`);
      f.style.setProperty('--ty', `${b.top - shift + b.height / 2 - (a.top + a.height / 2)}px`);
    }
  };
  let ticking = false;
  const update = () => {
    ticking = false;
    const p = progressOf(section);
    // hold the scattered state for the first fifth, finish a little before the end
    section.style.setProperty('--p', clamp((p - 0.18) / 0.62).toFixed(3));
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  measure(); update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { measure(); update(); });
  document.fonts?.ready.then(() => { measure(); update(); });
}

/* How it works: the held phone follows the step being read */
function initSteps() {
  const section = $('[data-steps]');
  if (!section) return;
  const steps = $$('[data-step]', section);
  const phones = $$('[data-screen]', section);
  const count = $('[data-step-count]', section);
  const show = (id: string) => {
    phones.forEach((p) => p.classList.toggle('is-active', p.dataset.screen === id));
    steps.forEach((s) => s.classList.toggle('is-current', s.dataset.step === id));
    const i = steps.findIndex((s) => s.dataset.step === id);
    if (count) count.textContent = `שלב ${i + 1} מתוך ${steps.length}`;
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) show((e.target as HTMLElement).dataset.step!);
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach((s) => io.observe(s));
}

/* Network: three beats along the pinned stage */
function initNetwork() {
  const section = $('[data-network]');
  if (!section) return;
  const desktop = window.matchMedia('(min-width: 961px)');
  let ticking = false;
  const update = () => {
    ticking = false;
    if (!desktop.matches || reduce.matches) { section.dataset.step = '3'; return; }
    const p = progressOf(section);
    section.dataset.step = p < 0.3 ? '1' : p < 0.64 ? '2' : '3';
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  desktop.addEventListener('change', update);
  update();
}

/* The demo card */
type Program = { id: string; name: string; kind: string; program: string; type: 'stamps' | 'points'; total: number; current: number; step: number; reward: string; rule: string; initial: string; tone: string };
function initDemo() {
  const root = $('[data-demo]');
  const dataEl = $('[data-demo-data]', root ?? document);
  if (!root || !dataEl) return;
  const programs: Program[] = JSON.parse(dataEl.textContent || '[]');
  const state = new Map(programs.map((p) => [p.id, p.current]));
  let active = programs[0];
  const el = {
    card: $('[data-demo-card]', root)!,
    initial: $('[data-demo-initial]', root)!,
    name: $('[data-demo-name]', root)!,
    program: $('[data-demo-program]', root)!,
    current: $('[data-demo-current]', root)!,
    of: $('[data-demo-of]', root)!,
    stamps: $('[data-demo-stamps]', root)!,
    meter: $('[data-demo-meter]', root)!,
    next: $('[data-demo-next]', root)!,
    rule: $('[data-demo-rule]', root)!,
    reward: $('[data-demo-reward]', root)!,
    state: $('[data-demo-state]', root)!,
    live: $('[data-demo-live]', root)!,
    add: $<HTMLButtonElement>('[data-demo-add]', root)!,
    addLabel: $('[data-demo-add-label]', root)!,
  };

  const render = (opts: { switched?: boolean; added?: boolean } = {}) => {
    const p = active;
    const cur = state.get(p.id)!;
    const done = cur >= p.total;
    el.card.dataset.tone = p.tone;
    el.initial.textContent = p.initial;
    el.name.textContent = p.name;
    el.program.textContent = `${p.program} · ${p.kind}`;
    el.current.textContent = String(cur);
    el.of.textContent = p.type === 'stamps' ? `מתוך ${p.total} חותמות` : `מתוך ${p.total} נקודות`;
    el.rule.textContent = p.rule;
    el.reward.textContent = p.reward;

    if (p.type === 'stamps') {
      el.stamps.hidden = false;
      el.meter.hidden = true;
      if (opts.switched || el.stamps.children.length !== p.total) {
        el.stamps.innerHTML = Array.from({ length: p.total }, () => '<li></li>').join('');
        el.stamps.style.gridTemplateColumns = `repeat(${p.total > 6 ? 5 : p.total}, 1fr)`;
      }
      Array.from(el.stamps.children).forEach((li, i) => {
        const on = i < cur;
        const wasOn = li.classList.contains('is-on');
        li.classList.toggle('is-on', on);
        li.classList.toggle('is-new', !!opts.added && on && !wasOn);
      });
    } else {
      el.stamps.hidden = true;
      el.meter.hidden = false;
      el.meter.style.setProperty('--fill', String(cur / p.total));
    }

    const left = p.total - cur;
    if (done) {
      el.next.textContent = `${p.reward}: מוכן למימוש`;
    } else if (p.type === 'stamps') {
      el.next.textContent = left === 1 ? `עוד ביקור אחד: ${p.reward}` : `עוד ${left} ביקורים: ${p.reward}`;
    } else {
      el.next.textContent = `עוד ${left} נקודות: ${p.reward}`;
    }
    el.state.hidden = !done;
    el.addLabel.textContent = done ? 'כרטיס חדש' : p.type === 'stamps' ? 'הוספת ביקור לדוגמה' : `קנייה לדוגמה (+${p.step} נק׳)`;

    if (opts.switched && !reduce.matches) {
      el.card.classList.remove('is-switching');
      void el.card.offsetWidth;
      el.card.classList.add('is-switching');
    }
    if (opts.added || opts.switched) {
      el.live.textContent = done
        ? `${p.name}: ${p.reward} מוכן למימוש בהדמיה.`
        : `${p.name}: ${cur} מתוך ${p.total}. ${el.next.textContent}.`;
    }
  };

  $$<HTMLInputElement>('input[name="demo-business"]', root).forEach((input) => {
    input.addEventListener('change', () => {
      active = programs.find((p) => p.id === input.value) ?? programs[0];
      render({ switched: true });
    });
  });
  el.add.addEventListener('click', () => {
    const cur = state.get(active.id)!;
    if (cur >= active.total) { state.set(active.id, 0); render({ switched: true }); return; }
    state.set(active.id, Math.min(active.total, cur + active.step));
    render({ added: true });
  });
  $('[data-demo-reset]', root)?.addEventListener('click', () => {
    programs.forEach((p) => state.set(p.id, p.current));
    render({ switched: true });
  });
  render();
}

/* FAQ accordion */
function initAccordion() {
  $$<HTMLButtonElement>('.acc__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      btn.closest('.acc__item')?.classList.toggle('is-open', open);
    });
  });
}

/* Interest form */
function initForm() {
  const form = $<HTMLFormElement>('[data-join-form]');
  if (!form) return;
  const status = $('[data-form-status]', form)!;
  const endpoint = form.dataset.endpoint?.trim() ?? '';
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phoneRe = /^(?:\+?972[-\s]?|0)(?:[23489]|5\d|7\d)[-\s]?\d{3}[-\s]?\d{4}$/;

  const rules: Record<string, (v: string) => string> = {
    business: (v) => (v.trim().length < 2 ? 'נא לכתוב את שם העסק.' : ''),
    type: (v) => (!v ? 'נא לבחור את סוג העסק.' : ''),
    name: (v) => (v.trim().length < 2 ? 'נא לכתוב שם של איש קשר.' : ''),
    contact: (v) => {
      const s = v.trim();
      if (!s) return 'נא לכתוב אימייל או מספר טלפון.';
      if (emailRe.test(s) || phoneRe.test(s.replace(/[()]/g, ''))) return '';
      return s.includes('@') ? 'כתובת האימייל לא נראית תקינה.' : 'מספר הטלפון לא נראה תקין. לדוגמה: 050-1234567';
    },
  };
  const check = (name: string) => {
    const field = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
    const out = $(`[data-error-for="${name}"]`, form);
    if (!field || !out) return true;
    const msg = rules[name](field.value);
    out.textContent = msg;
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };
  Object.keys(rules).forEach((name) => {
    const field = form.elements.namedItem(name) as HTMLElement | null;
    field?.addEventListener('blur', () => { if ((field as HTMLInputElement).value) check(name); });
    field?.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') check(name); });
  });

  const setStatus = (kind: 'success' | 'info' | 'error', title: string, body: string) => {
    status.className = `form__status is-${kind}`;
    status.innerHTML = '';
    const b = document.createElement('b'); b.textContent = title;
    const p = document.createElement('span'); p.textContent = body;
    status.append(b, p);
    status.focus({ preventScroll: true });
    status.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'nearest' });
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = 'form__status';
    const ok = Object.keys(rules).map(check).every(Boolean);
    if (!ok) {
      const first = $<HTMLElement>('[aria-invalid="true"]', form);
      first?.focus();
      return;
    }
    const { website, ...data } = Object.fromEntries(new FormData(form).entries());
    form.classList.add('is-loading');
    const submit = $<HTMLButtonElement>('[data-submit]', form)!;
    submit.setAttribute('aria-busy', 'true');
    try {
      if (website) {
        // The spam trap was filled in: a bot. Answer as if it worked and send nothing.
        form.reset();
        setStatus('success', 'תודה, קיבלנו את הפרטים.', 'נחזור אליכם בקרוב כדי לספר על ההצטרפות ולשמוע על העסק.');
        return;
      }
      if (!endpoint) {
        // No endpoint is configured yet: say so plainly instead of pretending the details were sent.
        await new Promise((r) => setTimeout(r, 500));
        setStatus('info', 'הטופס עדיין לא מחובר.', 'זו גרסה מוקדמת של האתר, והפרטים שמילאתם לא נשלחו לשום מקום. נחבר את הטופס בקרוב.');
        return;
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...data, source: 'perko-landing' }),
      });
      if (res.status === 503) {
        // The server side is deployed but not configured yet: say so plainly instead of pretending it was sent.
        setStatus('info', 'הטופס עדיין לא מחובר.', 'הפרטים שמילאתם לא נשלחו. אפשר לכתוב לנו בינתיים ל-hello@getperko.com.');
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setStatus('success', 'תודה, קיבלנו את הפרטים.', 'נחזור אליכם בקרוב כדי לספר על ההצטרפות ולשמוע על העסק.');
    } catch {
      setStatus('error', 'משהו השתבש בשליחה.', 'הפרטים לא נשלחו. נסו שוב בעוד רגע.');
    } finally {
      form.classList.remove('is-loading');
      submit.removeAttribute('aria-busy');
    }
  });
}

initMenu();
initDepth();
initStampTrail();
initJourney();
initReveal();
initConverge();
initSteps();
initNetwork();
initDemo();
initAccordion();
initForm();
