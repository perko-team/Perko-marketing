// The race for the golden card: the card page (/r/<code>) and the board (/race). Data comes from /api/race.
import { race } from '../data/race';

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const el = (tag: string, cls: string, text = '') => Object.assign(document.createElement(tag), { className: cls, textContent: text });

async function get(url: string) {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    return { status: res.status, data: res.ok ? await res.json() : null };
  } catch {
    return { status: 0, data: null };
  }
}

export async function initCardPage() {
  const code = (location.pathname.match(/^\/r\/([0-9a-f]{6})\/?$/) || [])[1];
  const msg = $('[data-msg]')!;
  const lis = Array.from(document.querySelectorAll<HTMLLIElement>('[data-grid] li'));
  if (!code) { msg.textContent = 'הקישור לא שלם. בדקו שהעתקתם את כולו.'; $('[data-name]')!.textContent = '?'; return; }

  const { status, data } = await get(`/api/race?code=${code}`);
  if (!data) {
    $('[data-name]')!.textContent = '?';
    msg.textContent = status === 404 ? 'לא מצאנו כרטיס בקישור הזה.' : status === 503 ? 'המרוץ עוד לא התחיל. נסו שוב בקרוב.' : 'אין חיבור כרגע. נסו לרענן בעוד רגע.';
    return;
  }
  const name: string = data.name;
  const stamps = Math.min(race.stamps, Number(data.stamps) || 0);
  document.title = `הכרטיס של ${name} במרוץ - Perko`;
  $('[data-title]')!.textContent = `הכרטיס של ${name}`;
  $('[data-name]')!.textContent = name;
  lis.forEach((li, i) => setTimeout(() => li.classList.toggle('is-on', i < stamps), 120 + i * 70));
  $('[data-count]')!.textContent = data.done ? 'הכרטיס מלא!' : `${stamps} מתוך ${race.stamps} חותמות`;

  const invite = $('[data-invite]')!;
  invite.hidden = false;
  $('[data-invite-title]')!.textContent = `קיבלתם הזמנה מ${name}`;
  $<HTMLAnchorElement>('[data-join]')!.href = race.joinUrl(code);

  $('[data-share-wrap]')!.hidden = false;
  const shareMsg = $('[data-share-msg]')!;
  $('[data-share]')!.addEventListener('click', async () => {
    const url = `${location.origin}/r/${code}`;
    const text = `אני במרוץ לכרטיס הזהב של Perko. הצטרפו דרך הקישור שלי ותוסיפו לי חותמת:`;
    try {
      if (navigator.share) { await navigator.share({ title: 'המרוץ לכרטיס הזהב', text, url }); return; }
      await navigator.clipboard.writeText(`${text} ${url}`);
      shareMsg.textContent = 'הקישור הועתק.';
    } catch { /* closed */ }
  });
}

export async function initBoardPage() {
  const list = $('[data-board]')!;
  const status = $('[data-status]');
  const draw = async () => {
    const { status: s, data } = await get('/api/race');
    if (!data) {
      list.replaceChildren(el('li', 'muted', s === 503 ? 'המרוץ עוד לא התחיל.' : 'אין חיבור כרגע.'));
      return;
    }
    if (status) status.textContent = data.players ? `${Number(data.players).toLocaleString('he-IL')} משתתפים במרוץ` : '';
    const top: { name: string; stamps: number; done: boolean }[] = data.top || [];
    if (!top.length) { list.replaceChildren(el('li', 'muted', 'עוד אין חותמות. החותמת הראשונה יכולה להיות שלכם.')); return; }
    list.replaceChildren(...top.map((p, i) => {
      const li = document.createElement('li');
      const bar = el('span', 'bar');
      const fill = document.createElement('span');
      fill.style.width = `${(Math.min(race.stamps, p.stamps) / race.stamps) * 100}%`;
      bar.append(fill);
      li.append(el('span', 'n', String(i + 1)), el('span', '', p.done ? `${p.name} · הכרטיס מלא` : p.name), el('span', 'n', `${p.stamps}/${race.stamps}`), bar);
      return li;
    }));
  };
  await draw();
  setInterval(() => { if (!document.hidden) draw(); }, 30000);
}
