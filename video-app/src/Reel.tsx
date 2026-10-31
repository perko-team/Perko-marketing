import React from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { accent, accentSettings, impact, mono } from './fonts';
import { C } from './tokens';
import { snap, accel, drift, lin, rnd } from './motion';
import { Blur } from './components/Blur';
import { Letters } from './components/Letters';
import { Whip, WriteOn, impactStyle, accentStyle } from './components/Kinetic';
import { Wordmark } from './components/Wordmark';

// Vertical reel for business owners, built on Motion DNA (STYLE_GUIDE): 1080x1920, 30 fps, 120 BPM.
// Clock: beat = 15 f, bar = 60 f, one scene per bar. The supplied clip is the hook (boot); its needle becomes the
// line that flashes into the title, on the music's drop (f218). The groove stops as the end card starts (f638).
// Safe zones (§9.2): HUD at y 170 and y 1620, hero content between them.
const W = 1080, H = 1920, BEAT = 15, BAR = 60;
const LIME = C.lime, INK = C.ink, PAPER = C.paper, MUTED = C.muted, RAISED = C.inkRaised;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const CLIP = 218; // the clip's length in frames; also the drop
const S1 = CLIP, S2 = S1 + BAR, S3 = S2 + BAR, S4 = S3 + BAR, S5 = S4 + BAR, S6 = S5 + BAR, S7 = S6 + BAR, END = S7 + BAR;
export const REEL_FRAMES = END + 75; // end card holds still for its last 15+ frames

/** Hebrew impact size that keeps a word within ~85% of the width (§9.2). */
const fit = (t: string, max = 300, w = 900) => Math.min(max, Math.round(w / (Array.from(t).length * 0.6)));

/** Base field with a soft radial lift (§3.5: never flat, never pure black or white). */
const FIELD: Record<string, [string, string]> = {
  lime: ['#E2FF66', LIME], ink: ['#1C1F18', INK], paper: ['#FFFFFC', PAPER], tint: ['#F3F4ED', C.tint],
};
const Field: React.FC<{ k: keyof typeof FIELD; children?: React.ReactNode }> = ({ k, children }) => (
  <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 78% 18%, ${FIELD[k][0]} 0%, ${FIELD[k][1]} 62%)` }}>{children}</AbsoluteFill>
);

const monoStyle = (size: number, color: string): React.CSSProperties => ({ fontFamily: mono, fontSize: size, letterSpacing: '0.12em', color, direction: 'rtl', whiteSpace: 'nowrap' });

/** Mono overline: label, a long rule, a number (§4.3). Snaps in from the right. */
const Overline: React.FC<{ f: number; at: number; label: string; n: string; color: string; top: number }> = ({ f, at, label, n, color, top }) => {
  const x = snap(f, at, 60, 0, 8);
  return (
    <div style={{ position: 'absolute', top, right: 90, display: 'flex', gap: 18, alignItems: 'center', opacity: f < at ? 0 : 1, transform: `translateX(${x}px)`, ...monoStyle(24, color) }}>
      <span>{label}</span><span style={{ width: 180, height: 1.5, background: color, opacity: 0.6 }} /><span>{n}</span>
    </div>
  );
};

/** Mono decode (§4.4): characters resolve from seeded glyphs, right to left, one per frame. */
const GLYPHS = 'אבגדהוזחטיכלמנסעפצקרשת0123456789';
const Decode: React.FC<{ f: number; at: number; text: string; style: React.CSSProperties }> = ({ f, at, text, style }) => {
  if (f < at) return null;
  const chars = Array.from(text);
  const shown = chars.map((ch, i) => (ch === ' ' || f - at >= i * 1 + 3 ? ch : GLYPHS[Math.floor(rnd(i * 31 + Math.floor(f)) * GLYPHS.length)]));
  return <div style={style}>{shown.join('')}</div>;
};

/* --- the loyalty cards of today --- */
const cardBase: React.CSSProperties = { position: 'absolute', width: 560, borderRadius: 30, padding: '30px 34px', fontFamily: impact, direction: 'rtl', textAlign: 'right', boxShadow: '0 30px 60px -24px rgba(0,0,0,.45)' };
const Punch: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div style={{ ...cardBase, background: PAPER, color: INK, ...style }}>
    <div style={{ fontSize: 26, color: MUTED }}>כרטיס ניקוב</div>
    <div style={{ fontSize: 40, fontWeight: 800 }}>בית הקפה</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginTop: 20 }}>
      {Array.from({ length: 10 }, (_, i) => <i key={i} style={{ aspectRatio: '1', borderRadius: '50%', background: i < 7 ? INK : '#D8DACE' }} />)}
    </div>
  </div>
);
const Club: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div style={{ ...cardBase, background: RAISED, color: PAPER, ...style }}>
    <div style={{ fontSize: 40, fontWeight: 800 }}>המעדנייה</div>
    <div style={{ fontSize: 26, color: '#B9BCB0' }}>כרטיס מועדון · חבר מס׳ 004817</div>
    <div style={{ display: 'flex', gap: 5, marginTop: 30, height: 56 }}>{Array.from({ length: 34 }, (_, i) => <i key={i} style={{ width: i % 3 ? 4 : 8, background: PAPER }} />)}</div>
  </div>
);
const AppTile: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div style={{ ...cardBase, background: PAPER, color: INK, display: 'flex', gap: 24, alignItems: 'center', ...style }}>
    <div style={{ width: 96, height: 96, borderRadius: 24, background: INK, flex: 'none' }} />
    <div><div style={{ fontSize: 40, fontWeight: 800 }}>המסעדה</div><div style={{ fontSize: 26, color: MUTED }}>אפליקציה נפרדת · עוד סיסמה</div></div>
  </div>
);
const Receipt: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div style={{ ...cardBase, width: 460, background: '#FFFFFF', color: INK, borderRadius: 8, ...style }}>
    <div style={{ fontSize: 26, color: MUTED }}>קוד הנחה בקבלה</div>
    <div style={{ fontSize: 48, fontWeight: 900, direction: 'ltr', textAlign: 'right' }}>4817-15</div>
    <div style={{ fontSize: 24, color: MUTED }}>חנות הספרים · בתוקף עד סוף החודש</div>
  </div>
);
/* --- HUD (§5.3, mirrored for RTL per §4.6; 9:16 margins per §9.2). Showcase scenes only. --- */
const HUD_SCENES = [
  { from: S2, to: S3, tag: 'זהות / מותג', dark: true },
  { from: S3, to: S4, tag: 'טיפוגרפיה בתנועה', dark: false },
  { from: S4, to: S5, tag: 'מוצר / כרטיס', dark: false },
  { from: S5, to: S6, tag: 'לעסקים / מסע', dark: true },
  { from: S6, to: S7, tag: 'הצעה / גישה מוקדמת', dark: false },
  { from: S7, to: END, tag: 'קריאה לפעולה', dark: false },
];
const tc = (f: number) => { const p = (v: number) => String(v).padStart(2, '0'); return `00:00:${p(Math.floor(f / 30))}:${p(f % 30)}`; };
const ReelHud: React.FC = () => {
  const f = useCurrentFrame();
  const i = HUD_SCENES.findIndex((s) => f >= s.from && f < s.to);
  if (i < 0) return null;
  const sc = HUD_SCENES[i];
  const color = sc.dark ? 'rgba(248,248,244,0.75)' : 'rgba(17,19,15,0.72)';
  const dot = sc.dark ? LIME : INK;
  const t: React.CSSProperties = { ...monoStyle(22, color), position: 'absolute', letterSpacing: '0.08em' };
  const br = (s: React.CSSProperties) => <span style={{ position: 'absolute', width: 20, height: 20, ...s }} />;
  const b = `1.5px solid ${color}`;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ ...t, top: 170, right: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
        פרקו - לעסקים 2026<span style={{ width: 11, height: 11, borderRadius: 11, background: dot }} />
        {br({ top: -12, right: -12, borderTop: b, borderRight: b })}
      </div>
      <div style={{ ...t, top: 170, left: 60 }}>סצנה {String(i + 1).padStart(2, '0')} / {String(HUD_SCENES.length).padStart(2, '0')}{br({ top: -12, left: -12, borderTop: b, borderLeft: b })}</div>
      <div style={{ ...t, top: 1620, right: 60 }}>{sc.tag}{br({ bottom: -12, right: -12, borderBottom: b, borderRight: b })}</div>
      <div style={{ ...t, top: 1620, left: 60, direction: 'ltr', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 9, height: 9, borderRadius: 9, background: dot, opacity: Math.floor(f / 8) % 2 ? 1 : 0.35 }} />{tc(f)}
        {br({ bottom: -12, left: -12, borderBottom: b, borderLeft: b })}
      </div>
    </AbsoluteFill>
  );
};

/* --- Boot: the supplied clip, with the hook lines snapping in on top. Its needle becomes the line (device 1). --- */
const ClipHook: React.FC = () => {
  const f = useCurrentFrame();
  const out1 = accel(f, 98, 0, 1, 8);
  const text: React.CSSProperties = { position: 'absolute', left: 60, right: 60, top: 330, textAlign: 'center', textShadow: '0 6px 30px rgba(0,0,0,.55)' };
  return (
    <AbsoluteFill style={{ background: '#050505' }}>
      <OffthreadVideo src={staticFile('hook.mp4')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} volume={(fr) => interpolate(fr, [0, CLIP - 12, CLIP], [1, 1, 0], clamp)} />
      <div style={{ ...text, opacity: 1 - out1, transform: `translateY(${-out1 * 120}px)` }}>
        <Blur y={out1 > 0 && out1 < 1 ? 40 : 0}>
          <Letters text="הכרטיס של הלקוח" f={f} at={8} style={{ ...impactStyle(96, PAPER), justifyContent: 'center' }} />
          <Letters text="הכי נאמן שלך" f={f} at={24} style={{ ...impactStyle(96, PAPER), justifyContent: 'center', marginTop: 10 }} />
        </Blur>
      </div>
      <div style={{ ...text }}><Whip g={f} at={106} style={{ ...impactStyle(124, LIME), textAlign: 'center' }}>עומד להיעלם.</Whip></div>
    </AbsoluteFill>
  );
};

/** Line -> flash (device 1, rotated vertical per §9.2): a lime line runs down the needle, thickens, blooms white, cools to lime. */
const LineFlash: React.FC = () => {
  const f = useCurrentFrame(); // starts at CLIP - 12
  const len = snap(f, 0, 0, 1, 7);
  const thick = accel(f, 5, 6, 90, 6);
  const flash = interpolate(f, [9, 11, 13, 22], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: W / 2 - thick / 2, top: 0, width: thick, height: 1100 * len, background: LIME, borderRadius: thick, boxShadow: `0 0 ${thick}px ${LIME}`, opacity: f < 12 ? 1 : 0 }} />
      <AbsoluteFill style={{ background: `radial-gradient(70% 50% at 50% 57%, #FFFDF2 0%, #F4FFB8 55%, ${LIME} 100%)`, opacity: flash }} />
    </AbsoluteFill>
  );
};

/* --- S1 title (lime): the cards of today burst in, then collapse into a glowing square (device 10). --- */
const Title: React.FC = () => {
  const f = useCurrentFrame();
  const fly = (at: number, x: number, y: number, r: number, fromX: number, fromY: number): React.CSSProperties => {
    const p = snap(f, at, 0, 1, 9);
    const v = Math.abs(snap(f, at, 0, 1, 9) - snap(f - 1, at, 0, 1, 9));
    const c = accel(f, 44, 0, 1, 10);
    const px = fromX + (x - fromX) * p, py = fromY + (y - fromY) * p;
    const cx = W / 2 - 280, cy = 1180;
    const wob = drift(f, at + 9, 0, 1, 35) * 3;
    return { left: px + (cx - px) * c, top: py + (cy - py) * c, opacity: f < at ? 0 : 1 - c * 0.2, transform: `rotate(${(r + wob) * (1 - c)}deg) scale(${0.82 * (1 - c * 0.75)})`, filter: v > 0.02 ? `blur(${Math.min(14, v * 120)}px)` : undefined };
  };
  const sq = accel(f, 50, 0, 1, 10);
  return (
    <Field k="lime">
      <Overline f={f} at={6} label="הבעיה" n="01" color={MUTED} top={330} />
      <div style={{ position: 'absolute', top: 400, left: 60, right: 90 }}>
        <Letters text="כל עסק" f={f} at={2} style={impactStyle(fit('כל עסק', 300), INK)} />
        <div style={{ marginTop: 6 }}><WriteOn g={f} at={BEAT} style={accentStyle(100, INK)}>עם כרטיס אחר.</WriteOn></div>
      </div>
      <Punch style={fly(BEAT + 5, 80, 900, -9, -700, 900)} />
      <Club style={fly(BEAT + 7, 470, 1080, 7, W + 300, 1080)} />
      <AppTile style={fly(BEAT + 9, 60, 1270, -5, -700, 1270)} />
      <Receipt style={fly(BEAT + 11, 560, 1430, 9, W + 300, 1430)} />
      <div style={{ position: 'absolute', left: W / 2 - 110, top: 1180 - 110 + 120, width: 220, height: 220, borderRadius: 48 * (1 - sq) + 4, background: INK, boxShadow: f >= 44 ? `0 0 ${60 + sq * 80}px ${LIME}` : undefined, transform: `scale(${f < 44 ? 0 : 0.3 + sq * 18})`, transformOrigin: 'center' }} />
    </Field>
  );
};

/* --- S2 identity (ink): the wordmark, with its dot opening portal rings into paper (device 11). --- */
const Identity: React.FC = () => {
  const f = useCurrentFrame();
  const rev = snap(f, 2, 0, 1, 10);
  const push = drift(f, 10, 1, 1.03, 40);
  const ring = accel(f, 44, 0, 1, 14);
  const hole = accel(f, 49, 0, 1, 11);
  return (
    <Field k="ink">
      <div style={{ position: 'absolute', top: 620, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${push})` }}>
        <div style={{ position: 'relative', fontSize: 230 }}>
          <Blur x={f > 2 && f < 12 ? 30 * (1 - rev) : 0}><Wordmark size={230} color={LIME} disc={LIME} reveal={rev} hideDisc={f < 9} /></Blur>
          <div style={{ position: 'absolute', right: '0.25em', top: '0.62em', width: 0, height: 0 }}>
            {[0, 1, 2, 3].map((k) => (
              <div key={k} style={{ position: 'absolute', left: 0, top: 0, width: 200, height: 200, marginLeft: -100, marginTop: -100, borderRadius: '50%', border: `${26 - k * 4}px solid ${k % 2 ? RAISED : LIME}`, transform: `scale(${ring * (26 - k * 4)})`, opacity: f < 44 ? 0 : 1 }} />
            ))}
            <div style={{ position: 'absolute', width: 200, height: 200, marginLeft: -100, marginTop: -100, borderRadius: '50%', background: PAPER, transform: `scale(${hole * 26})` }} />
          </div>
        </div>
        <div style={{ marginTop: 70, width: 900, display: 'flex', justifyContent: 'flex-end' }}><WriteOn g={f} at={BEAT + 1} style={accentStyle(78, PAPER)}>כרטיס אחד לכל השכונה</WriteOn></div>
        <div style={{ marginTop: 34 }}><Decode f={f} at={BEAT * 2} text="מועדון אחד · כל העסקים המשתתפים" style={monoStyle(28, C.onInk)} /></div>
      </div>
    </Field>
  );
};

/* --- S3 customers (paper): one word per beat, the last in the accent voice; slab wipe into lime (device 7). --- */
const Customers: React.FC = () => {
  const f = useCurrentFrame();
  const words = ['סורקים.', 'צוברים.', 'חוזרים.'];
  const k = Math.min(3, Math.floor(f / BEAT));
  const e = accel(f, 51, W + 900, -900, 9);
  return (
    <Field k="paper">
      <Overline f={f} at={1} label="הלקוחות שלכם" n="02" color={MUTED} top={560} />
      <div style={{ position: 'absolute', top: 760, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        {k < 3
          ? <Whip key={k} g={f} at={k * BEAT + 1} style={impactStyle(fit(words[k], 290), INK)}>{words[k]}</Whip>
          : <WriteOn g={f} at={3 * BEAT + 1} style={accentStyle(220, INK)}>ומממשים.</WriteOn>}
      </div>
      <div style={{ position: 'absolute', top: 1130, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 22 }}>
        {[0, 1, 2, 3].map((i) => <span key={i} style={{ width: 22, height: 22, borderRadius: 22, background: i <= k ? INK : C.tintStrong }} />)}
      </div>
      {f >= 51 && (
        <>
          <AbsoluteFill style={{ background: INK, clipPath: `polygon(${e - 300}px 0, ${e}px 0, ${e - 700}px ${H}px, ${e - 1000}px ${H}px)` }} />
          <AbsoluteFill style={{ background: LIME, clipPath: `polygon(${e + 40}px 0, ${W + 2000}px 0, ${W + 2000}px ${H}px, ${e - 660}px ${H}px)` }} />
        </>
      )}
    </Field>
  );
};

/* --- S4 card (lime): stamps land with an expo-out count; the tenth stamp bursts into ink (device 9). --- */
const Card: React.FC = () => {
  const f = useCurrentFrame();
  const y = snap(f, 3, 340, 0, 9);
  const v = Math.abs(snap(f, 3, 340, 0, 9) - snap(f - 1, 3, 340, 0, 9));
  const tAt = (i: number) => 12 + Math.round(22 * Math.pow(i / 9, 1.8));
  const full = f >= tAt(9);
  const burst = snap(f, 48, 0, 1, 10);
  const disc = accel(f, 50, 0, 1, 10);
  return (
    <Field k="lime">
      <div style={{ position: 'absolute', top: 330, left: 0, right: 90, display: 'flex', justifyContent: 'flex-end' }}>
        {f < 2 * BEAT + 6
          ? <Letters text="כרטיס" f={f} at={1} style={impactStyle(240, INK)} />
          : <Whip g={f} at={2 * BEAT + 6} style={impactStyle(240, INK)}>מלא.</Whip>}
      </div>
      <div style={{ position: 'absolute', top: 680, left: 90, width: 900, transform: `translateY(${y}px)`, filter: v > 3 ? `blur(${Math.min(12, v / 4)}px)` : undefined }}>
        <div style={{ background: PAPER, borderRadius: 44, padding: 56, boxShadow: '0 36px 70px -30px rgba(17,19,15,.45)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', ...monoStyle(24, MUTED) }}><span>קפה פינה · לדוגמה</span><span>10 = קפה</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 26, marginTop: 44, direction: 'rtl' }}>
            {Array.from({ length: 10 }, (_, i) => {
              const s = snap(f, tAt(i), 1.6, 1, 6);
              const on = f >= tAt(i);
              return (
                <div key={i} style={{ aspectRatio: '1', borderRadius: '50%', border: `6px solid ${INK}`, position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: INK, opacity: on ? 1 : 0, transform: `scale(${s})` }} />
                  {i === 9 && f >= 48 && (
                    <>
                      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 140, height: 140, marginLeft: -70, marginTop: -70, borderRadius: '50%', border: `8px solid ${INK}`, transform: `scale(${1 + burst * 9})`, opacity: 1 - burst }} />
                      {Array.from({ length: 12 }, (_, j) => (
                        <div key={j} style={{ position: 'absolute', left: '50%', top: '50%', width: 120 * burst + 4, height: 6, background: INK, transformOrigin: '0 50%', transform: `rotate(${j * 30}deg) translateX(${80 + burst * 360}px)`, opacity: 1 - burst }} />
                      ))}
                      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 200, height: 200, marginLeft: -100, marginTop: -100, borderRadius: '50%', background: INK, transform: `scale(${disc * 30})` }} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ marginTop: 50, display: 'flex', justifyContent: 'center' }}>
          {full && <div style={{ background: INK, color: LIME, borderRadius: 999, padding: '22px 52px', fontFamily: impact, fontWeight: 900, fontSize: 60, direction: 'rtl', transform: `scale(${snap(f, tAt(9) + 2, 0.6, 1, 7)})`, opacity: snap(f, tAt(9) + 2, 0, 1, 4) }}>ההטבה מוכנה.</div>}
        </div>
      </div>
    </Field>
  );
};

/* --- S5 journey (ink): one step per beat, the number disc is the signal; glitch slices into tint (device 5). --- */
const Journey: React.FC = () => {
  const f = useCurrentFrame();
  const k = Math.min(3, Math.floor(f / BEAT));
  const words = ['נרשמים.', 'מגדירים.', 'מציבים.'];
  const subs = ['טופס קצר · בחינם', 'ההטבה שלכם, הכללים שלכם', 'קוד QR ליד הקופה', 'בשלב הפיילוט'];
  const roll = snap(f, k * BEAT, 1, 0, 7);
  return (
    <Field k="ink">
      <Overline f={f} at={1} label="המסע של עסק" n="03" color={C.onInk} top={330} />
      <div style={{ position: 'absolute', top: 470, left: W / 2 - 120, width: 240, height: 240, borderRadius: '50%', background: LIME, overflow: 'hidden', display: 'grid', placeItems: 'center', transform: `scale(${snap(f, 0, 0.4, 1, 8)})` }}>
        <Blur y={roll * 50}><div style={{ fontFamily: impact, fontWeight: 900, fontSize: 150, color: INK, transform: `translateY(${roll * 90}%)` }}>{k + 1}</div></Blur>
      </div>
      <div style={{ position: 'absolute', top: 820, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        {k < 3
          ? <Whip key={k} g={f} at={k * BEAT + 1} style={impactStyle(fit(words[k], 250), PAPER)}>{words[k]}</Whip>
          : <WriteOn g={f} at={3 * BEAT + 1} style={accentStyle(150, PAPER)}>והכרטיס פעיל.</WriteOn>}
      </div>
      <div style={{ position: 'absolute', top: 1110, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Decode key={k} f={f} at={k * BEAT + 3} text={subs[k]} style={monoStyle(30, C.onInk)} />
      </div>
      <div style={{ position: 'absolute', top: 1260, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 16, direction: 'rtl' }}>
        {[0, 1, 2, 3].map((i) => <span key={i} style={{ width: 150, height: 8, borderRadius: 8, background: i <= k ? PAPER : RAISED }} />)}
      </div>
      {f >= 52 && Array.from({ length: 10 }, (_, i) => {
        const p = snap(f, 52 + (i % 3), 0, 1, 5);
        const dir = i % 2 ? 1 : -1;
        const off = (1 - p) * (W * (0.6 + rnd(i * 7) * 0.6)) * dir;
        return <div key={i} style={{ position: 'absolute', left: off, top: (H / 10) * i, width: W, height: H / 10 + 1, background: C.tint }} />;
      })}
    </Field>
  );
};

/* --- S6 offer (tint): "free"; the next word grows out of it with a lime field behind (device 4). --- */
const JOIN_TOP = 760;
const Offer: React.FC = () => {
  const f = useCurrentFrame();
  const push = drift(f, 8, 1, 1.03, 40);
  const grow = accel(f, 46, 0, 1, 14);
  const word = snap(f, 47, 0.22, 1, 13);
  return (
    <Field k="tint">
      <Overline f={f} at={1} label="גישה מוקדמת" n="04" color={MUTED} top={560} />
      <div style={{ position: 'absolute', top: 700, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${push})`, opacity: 1 - grow }}>
        <Letters text="בחינם." f={f} at={2} style={impactStyle(fit('בחינם.', 300), INK)} />
        <div style={{ marginTop: 10, width: 900, display: 'flex', justifyContent: 'flex-end' }}><WriteOn g={f} at={BEAT + 1} style={accentStyle(80, INK)}>בלי התחייבות לתשלום.</WriteOn></div>
        <div style={{ marginTop: 40 }}><Decode f={f} at={2 * BEAT} text="פיילוט בעמק רפאים ובדרך בית לחם" style={monoStyle(26, MUTED)} /></div>
      </div>
      {f >= 46 && (
        <>
          <div style={{ position: 'absolute', left: W / 2 - 260 - grow * 800, top: 820 - 140 - grow * 1600, width: 520 + grow * 1600, height: 280 + grow * 3200, borderRadius: 60 * (1 - grow), background: LIME }} />
          <div style={{ position: 'absolute', top: JOIN_TOP, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${word})` }}>
            <Blur x={(1 - word) * 30}><JoinWord dot={1} /></Blur>
          </div>
        </>
      )}
    </Field>
  );
};

/** "הצטרפו" with its period as its own disc: the disc later becomes the ink mask. */
const JoinWord: React.FC<{ dot: number }> = ({ dot }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', direction: 'rtl', gap: 12 }}>
    <span style={impactStyle(250, INK)}>הצטרפו</span>
    <span style={{ position: 'relative', width: 54, height: 54, display: 'inline-block' }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: INK, transform: `scale(${dot})` }} />
    </span>
  </div>
);

/* --- S7 call to action (lime): the period grows into the ink mask (device 2). --- */
const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const push = drift(f, 0, 1, 1.025, 44);
  const mask = accel(f, 46, 1, 80, 14);
  return (
    <Field k="lime">
      <div style={{ position: 'absolute', top: JOIN_TOP, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${push})` }}>
        <JoinWord dot={mask} />
        <div style={{ marginTop: 16, width: 900, display: 'flex', justifyContent: 'flex-end' }}><WriteOn g={f} at={8} style={accentStyle(96, INK)}>לגישה המוקדמת</WriteOn></div>
        <div style={{ marginTop: 50 }}><Decode f={f} at={20} text="הקישור בביו" style={monoStyle(34, MUTED)} /></div>
      </div>
    </Field>
  );
};

/* --- End (ink): the lime dot travels and writes the wordmark, then becomes its "o" (device 12). --- */
const End: React.FC = () => {
  const f = useCurrentFrame();
  const p = snap(f, 4, 0, 1, 20);
  const landed = f >= 24;
  return (
    <Field k="ink">
      <div style={{ position: 'absolute', top: 700, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', fontSize: 200 }}>
          <Wordmark size={200} color={PAPER} disc={LIME} reveal={p} hideDisc={!landed} />
          {!landed && f >= 4 && (
            <Blur x={Math.abs(snap(f, 4, 0, 1, 20) - snap(f - 1, 4, 0, 1, 20)) * 400}>
              <span style={{ position: 'absolute', top: '0.47em', left: `calc(${p * 100}% - 0.5em)`, width: '0.5em', height: '0.5em', borderRadius: '50%', background: LIME, boxShadow: `0 0 60px 20px rgba(215,255,53,.35)` }} />
            </Blur>
          )}
        </div>
        <div style={{ marginTop: 60, width: 900, display: 'flex', justifyContent: 'flex-end' }}><WriteOn g={f} at={28} style={accentStyle(70, PAPER)}>כל ההטבות. מקום אחד.</WriteOn></div>
        <div style={{ marginTop: 40, width: lin(f, 36, 0, 700, 8), height: 1, background: 'rgba(248,248,244,.4)' }} />
        <div style={{ marginTop: 34 }}><Decode f={f} at={40} text="גישה מוקדמת · הצטרפות בחינם" style={monoStyle(30, C.onInk)} /></div>
      </div>
    </Field>
  );
};

export const PerkoReel: React.FC = () => (
  <AbsoluteFill style={{ background: INK }}>
    <Sequence from={CLIP - 3}>
      <Audio src={staticFile('music.wav')} startFrom={117} volume={(f) => interpolate(f, [0, REEL_FRAMES - CLIP - 10, REEL_FRAMES - CLIP + 3], [0.9, 0.9, 0], clamp)} />
    </Sequence>
    <Sequence from={0} durationInFrames={CLIP}><ClipHook /></Sequence>
    <Sequence from={S1} durationInFrames={BAR}><Title /></Sequence>
    <Sequence from={S2} durationInFrames={BAR}><Identity /></Sequence>
    <Sequence from={S3} durationInFrames={BAR}><Customers /></Sequence>
    <Sequence from={S4} durationInFrames={BAR}><Card /></Sequence>
    <Sequence from={S5} durationInFrames={BAR}><Journey /></Sequence>
    <Sequence from={S6} durationInFrames={BAR}><Offer /></Sequence>
    <Sequence from={S7} durationInFrames={BAR}><Cta /></Sequence>
    <Sequence from={END} durationInFrames={REEL_FRAMES - END}><End /></Sequence>
    <Sequence from={CLIP - 12} durationInFrames={24}><LineFlash /></Sequence>
    <ReelHud />
  </AbsoluteFill>
);
