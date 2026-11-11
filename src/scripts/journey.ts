// The business journey: the card on the right draws the next line as each step on the left is read.

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

export function initJourney() {
  const section = document.getElementById('journey');
  const card = section?.querySelector<HTMLElement>('[data-jcard]');
  if (!section || !card) return;
  const steps = Array.from(section.querySelectorAll<HTMLElement>('[data-jstep]'));
  const rows = Array.from(card.querySelectorAll<HTMLElement>('[data-from]'));

  const show = (state: number) => {
    card.dataset.state = String(state);
    rows.forEach((r) => r.classList.toggle('is-on', Number(r.dataset.from) <= state));
    steps.forEach((s) => s.classList.toggle('is-current', Number(s.dataset.jstep) === state));
    section.style.setProperty('--fill', String(state / steps.length));
  };

  // Reduced motion: the whole journey is shown at once, with no scroll-driven state.
  if (reduce.matches) { show(steps.length); return; }
  show(0);
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) show(Number((e.target as HTMLElement).dataset.jstep));
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach((s) => io.observe(s));
}
