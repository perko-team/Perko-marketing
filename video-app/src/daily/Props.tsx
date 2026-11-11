import React from 'react';
import { Img, staticFile } from 'remotion';
import { z } from 'zod';
import { C } from '../tokens';
import { snap, accel, drift, lin } from '../motion';
import { impact, mono } from '../fonts';
import { Wordmark } from '../components/Wordmark';
import { LIME, INK, PAPER, MUTED, W } from '../Reel';

// The objects of a scene: what the viewer looks at under the words. Each prop sits in the band y 900-1560
// (above Instagram's caption area) and enters on the scene's first beats. Drawn in code, in the brand's colours.

export const visual = z.discriminatedUnion('type', [
  z.object({ type: z.literal('card'), stamps: z.number().int().min(0).max(10), name: z.string().optional() }),
  z.object({ type: z.literal('phone'), shot: z.string(), tap: z.tuple([z.number(), z.number()]).optional() }),
  z.object({ type: z.literal('chat'), lines: z.array(z.object({ text: z.string(), me: z.boolean().optional() })).min(1).max(3) }),
  z.object({ type: z.literal('stamp'), text: z.string(), tone: z.enum(['red', 'lime']) }),
  z.object({ type: z.literal('flag'), tone: z.enum(['red', 'green']) }),
  z.object({ type: z.literal('stars'), n: z.number().int().min(0).max(5) }),
  z.object({ type: z.literal('clock'), time: z.string() }),
  z.object({ type: z.literal('wallet'), cards: z.number().int().min(2).max(12) }),
  z.object({ type: z.literal('receipt'), lines: z.array(z.string()).min(1).max(4) }),
]);
export type Visual = z.infer<typeof visual>;

const RED = '#FF5A3C';
const shadow = '0 40px 80px -36px rgba(17,19,15,.55)';
const rise = (f: number, at = 4) => ({ y: snap(f, at, 520, 0, 12), r: snap(f, at, -7, 0, 14) });

/* ---- punch card: stamps land one by one ---- */
const Card: React.FC<{ f: number; stamps: number; name?: string; dark: boolean }> = ({ f, stamps, name, dark }) => {
  const { y, r } = rise(f);
  const tAt = (i: number) => 14 + i * 3;
  return (
    <div style={{ position: 'absolute', left: 120, top: 980, width: 840, transform: `translateY(${y}px) rotate(${r}deg)` }}>
      <div style={{ background: dark ? '#23271E' : '#FCFBF6', borderRadius: 44, padding: '40px 50px', boxShadow: shadow }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
          <span style={{ fontFamily: impact, fontWeight: 800, fontSize: 52, color: dark ? PAPER : INK }}>{name ?? 'הכרטיסייה שלך'}</span>
          <Wordmark size={40} color={dark ? LIME : INK} disc={dark ? LIME : INK} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 22, marginTop: 34, direction: 'rtl' }}>
          {Array.from({ length: 10 }, (_, i) => {
            const on = i < stamps, s = on ? snap(f, tAt(i), 1.8, 1, 6) : 1;
            return <div key={i} style={{ aspectRatio: '1', borderRadius: '50%', transform: `scale(${s})`, opacity: on && f < tAt(i) ? 0 : 1,
              background: on ? LIME : 'transparent', border: on ? `5px solid ${INK}` : `5px dashed ${dark ? '#4A4F43' : C.tintStrong}` }} />;
          })}
        </div>
      </div>
    </div>
  );
};

/* ---- the Perko app in a phone, rising from the bottom, with an optional tap ---- */
const Phone: React.FC<{ f: number; shot: string; tap?: [number, number] }> = ({ f, shot, tap }) => {
  const { y, r } = rise(f, 3);
  const K = 1.12, w = 412 * K, h = 892 * K;
  const tp = tap ? lin(f, 30, 0, 1, 12) : 0;
  return (
    <div style={{ position: 'absolute', left: W / 2 - w / 2 - 14, top: 1010, transform: `translateY(${y}px) rotate(${r}deg)`, transformOrigin: '50% 100%' }}>
      <div style={{ width: w + 28, height: h + 28, padding: 14, borderRadius: 74, background: INK, boxShadow: shadow, boxSizing: 'border-box' }}>
        <div style={{ width: w, height: h, borderRadius: 60, overflow: 'hidden', position: 'relative', background: PAPER }}>
          <Img src={staticFile(`shots/${shot}.png`)} style={{ width: w, height: h, display: 'block' }} />
          {tap && f >= 30 && <div style={{ position: 'absolute', left: tap[0] * K - 60, top: tap[1] * K - 60, width: 120, height: 120, borderRadius: '50%',
            border: `6px solid ${LIME}`, background: 'rgba(215,255,53,.25)', transform: `scale(${0.4 + tp * 0.9})`, opacity: 1 - tp * 0.7 }} />}
        </div>
      </div>
    </div>
  );
};

/* ---- chat bubbles arriving like messages, with a typing indicator first ---- */
const Chat: React.FC<{ f: number; lines: { text: string; me?: boolean }[] }> = ({ f, lines }) => (
  <div style={{ position: 'absolute', left: 80, right: 80, top: 1040, display: 'flex', flexDirection: 'column', gap: 34, direction: 'rtl' }}>
    {lines.map((l, i) => {
      const at = 6 + i * 16;
      if (f < at) return null;
      const typing = f < at + 8;
      const s = snap(f, at, 0.6, 1, 8);
      return (
        <div key={i} style={{ alignSelf: l.me ? 'flex-start' : 'flex-end', maxWidth: 760, transform: `scale(${s})`, transformOrigin: l.me ? '100% 100%' : '0% 100%',
          background: l.me ? LIME : PAPER, color: INK, borderRadius: 54, padding: typing ? '38px 54px' : '34px 54px', boxShadow: shadow,
          fontFamily: impact, fontWeight: 700, fontSize: 78, lineHeight: 1.15 }}>
          {typing ? <span style={{ display: 'flex', gap: 14 }}>{[0, 1, 2].map((d) => <i key={d} style={{ width: 20, height: 20, borderRadius: '50%', background: INK, opacity: 0.3 + 0.7 * ((Math.floor(f / 3) + d) % 3 === 0 ? 1 : 0) }} />)}</span> : l.text}
        </div>
      );
    })}
  </div>
);

/* ---- rubber stamp slammed onto the screen ---- */
const Stamp: React.FC<{ f: number; text: string; tone: 'red' | 'lime'; dark: boolean }> = ({ f, text, tone }) => {
  const at = 10, s = snap(f, at, 2.4, 1, 6), shake = f >= at + 6 && f < at + 12 ? Math.sin(f * 3) * 8 : 0;
  const col = tone === 'red' ? RED : LIME;
  if (f < at) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1060, display: 'flex', justifyContent: 'center', transform: `translateX(${shake}px)` }}>
      <div style={{ transform: `scale(${s}) rotate(-9deg)`, border: `14px solid ${col}`, borderRadius: 28, padding: '18px 60px', color: col,
        fontFamily: impact, fontWeight: 900, fontSize: 170, lineHeight: 1, letterSpacing: '0.02em', opacity: snap(f, at, 0, 0.95, 3), mixBlendMode: 'normal' }}>{text}</div>
    </div>
  );
};

/* ---- a flag on a pole, waving ---- */
const Flag: React.FC<{ f: number; tone: 'red' | 'green' }> = ({ f, tone }) => {
  const up = snap(f, 4, 600, 0, 12), col = tone === 'red' ? RED : LIME;
  const pts = Array.from({ length: 13 }, (_, i) => {
    const x = (i / 12) * 420, a = Math.sin(f / 4 - i / 2) * 18 * (i / 12);
    return [x, a] as const;
  });
  const top = pts.map(([x, a]) => `${x},${a}`).join(' ');
  const bot = [...pts].reverse().map(([x, a]) => `${x},${a + 260}`).join(' ');
  return (
    <svg width="620" height="640" viewBox="-40 -40 560 640" style={{ position: 'absolute', left: W / 2 - 300, top: 960, transform: `translateY(${up}px)`, overflow: 'visible' }}>
      <rect x="-22" y="-30" width="22" height="620" rx="10" fill={INK} />
      <polygon points={`${top} ${bot}`} fill={col} stroke={INK} strokeWidth="8" strokeLinejoin="round" />
    </svg>
  );
};

/* ---- review stars filling ---- */
const Stars: React.FC<{ f: number; n: number }> = ({ f, n }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: 1080, display: 'flex', justifyContent: 'center', gap: 22, direction: 'ltr' }}>
    {Array.from({ length: 5 }, (_, i) => {
      const at = 6 + i * 4, s = snap(f, at, 0, 1, 7), on = i < n;
      return (
        <svg key={i} width="150" height="150" viewBox="0 0 24 24" style={{ transform: `scale(${s})` }}>
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill={on ? LIME : 'transparent'} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    })}
  </div>
);

/* ---- a wall clock whose hands spin to the time ---- */
const Clock: React.FC<{ f: number; time: string; dark: boolean }> = ({ f, time, dark }) => {
  const [hh, mm] = time.split(':').map(Number);
  const spin = drift(f, 2, 1, 0, 24);
  const mA = (mm! / 60) * 360 + spin * 720, hA = ((hh! % 12) / 12) * 360 + (mm! / 60) * 30 + spin * 60;
  const s = snap(f, 2, 0.5, 1, 10);
  const face = dark ? PAPER : INK, bg = dark ? '#23271E' : PAPER;
  return (
    <div style={{ position: 'absolute', left: W / 2 - 260, top: 1000, width: 520, height: 520, transform: `scale(${s})` }}>
      <svg width="520" height="520" viewBox="-110 -110 220 220">
        <circle r="100" fill={bg} stroke={face} strokeWidth="8" />
        {Array.from({ length: 12 }, (_, i) => <rect key={i} x="-3" y="-92" width="6" height={i % 3 ? 10 : 18} fill={face} transform={`rotate(${i * 30})`} />)}
        <rect x="-5" y="-55" width="10" height="62" rx="5" fill={face} transform={`rotate(${hA})`} />
        <rect x="-3.5" y="-82" width="7" height="90" rx="3.5" fill={LIME} stroke={INK} strokeWidth="1.5" transform={`rotate(${mA})`} />
        <circle r="9" fill={face} />
      </svg>
      <div style={{ position: 'absolute', bottom: -90, left: 0, right: 0, textAlign: 'center', fontFamily: mono, fontSize: 64, color: face, opacity: lin(f, 22, 0, 1, 6) }}>{time}</div>
    </div>
  );
};

/* ---- too many paper cards fanning out of a wallet ---- */
const Wallet: React.FC<{ f: number; cards: number }> = ({ f, cards }) => {
  const shades = ['#F4E9D8', '#E8F1FA', '#FBE3E1', '#E6F5E9', '#FFF3C4', '#EDE7F6'];
  return (
    <div style={{ position: 'absolute', left: W / 2 - 360, top: 1040, width: 720, height: 520 }}>
      {Array.from({ length: cards }, (_, i) => {
        const at = 4 + i * 2, p = snap(f, at, 0, 1, 10), a = (i - (cards - 1) / 2) * 9;
        return <div key={i} style={{ position: 'absolute', left: 170, top: 40, width: 380, height: 240, borderRadius: 22, background: shades[i % shades.length],
          border: `4px solid ${INK}`, transformOrigin: '50% 160%', transform: `rotate(${a * p}deg) translateY(${(1 - p) * 120}px)`, opacity: f < at ? 0 : 1 }}>
          <div style={{ display: 'flex', gap: 10, padding: 22 }}>{Array.from({ length: 5 }, (_, k) => <i key={k} style={{ width: 34, height: 34, borderRadius: '50%', border: `3px dashed ${INK}`, background: k < (i % 4) ? INK : 'transparent' }} />)}</div>
        </div>;
      })}
      <div style={{ position: 'absolute', left: 80, top: 230, width: 560, height: 300, borderRadius: 40, background: INK, boxShadow: shadow }} />
      <div style={{ position: 'absolute', left: 80, top: 230, width: 560, height: 70, borderRadius: '40px 40px 12px 12px', background: '#2C3126' }} />
    </div>
  );
};

/* ---- a till receipt printing line by line ---- */
const Receipt: React.FC<{ f: number; lines: string[] }> = ({ f, lines }) => {
  const h = 140 + lines.length * 96;
  const shown = lin(f, 4, 0, h, 16);
  return (
    <div style={{ position: 'absolute', left: W / 2 - 300, top: 980, width: 600, height: shown, overflow: 'hidden' }}>
      <div style={{ width: 600, height: h, background: '#FFFFFC', boxShadow: shadow, padding: '40px 48px', boxSizing: 'border-box', direction: 'rtl',
        fontFamily: mono, fontSize: 40, color: INK, display: 'flex', flexDirection: 'column', gap: 28 }}>
        {lines.map((l, i) => <div key={i} style={{ borderBottom: i < lines.length - 1 ? `3px dashed ${C.tintStrong}` : 'none', paddingBottom: 18 }}>{l}</div>)}
      </div>
    </div>
  );
};

export const Prop: React.FC<{ v: Visual; f: number; dark: boolean }> = ({ v, f, dark }) => {
  switch (v.type) {
    case 'card': return <Card f={f} stamps={v.stamps} name={v.name} dark={dark} />;
    case 'phone': return <Phone f={f} shot={v.shot} tap={v.tap} />;
    case 'chat': return <Chat f={f} lines={v.lines} />;
    case 'stamp': return <Stamp f={f} text={v.text} tone={v.tone} dark={dark} />;
    case 'flag': return <Flag f={f} tone={v.tone} />;
    case 'stars': return <Stars f={f} n={v.n} />;
    case 'clock': return <Clock f={f} time={v.time} dark={dark} />;
    case 'wallet': return <Wallet f={f} cards={v.cards} />;
    case 'receipt': return <Receipt f={f} lines={v.lines} />;
  }
};
/** the frame (scene-relative) where a prop's own hit lands, for its sound */
export const propHit = (v: Visual): number | null =>
  v.type === 'stamp' ? 10 : v.type === 'card' ? 14 : v.type === 'phone' ? 6 : v.type === 'chat' ? 14 : v.type === 'flag' ? 8 : v.type === 'stars' ? 6 : null;

export { MUTED };
