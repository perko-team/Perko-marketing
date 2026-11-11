import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { impact } from './fonts';
import { C } from './tokens';
import { snap, accel, drift, rnd } from './motion';
import { Blur } from './components/Blur';
import { Letters } from './components/Letters';
import { WriteOn, impactStyle, accentStyle } from './components/Kinetic';
import {
  W, H, BEAT, BAR, LIME, INK, PAPER, MUTED, clamp, fit, Field, monoStyle, Overline, Decode,
  Cta, End, Hud916, HudScene, JoinWord, JOIN_TOP,
} from './Reel';

// Recruitment reel, Motion DNA (STYLE_GUIDE), flat and premium at the user's request: no 3D, no chromatic split.
// 120 BPM: beat 15 f, bar 60 f, one scene per bar. The score (public/recruit-score.wav, a placeholder for the
// client's track) has a paper clack at f15, the drop at f120 and the groove stop at f360 (the end card).
// Story: a punch card (boot) -> its hole opens into lime (title) -> a street of blank round signs (the drop)
// -> where -> one Perko card with two open places -> join -> the wordmark.
const R0 = BAR, R1 = 2 * BAR, R2 = 3 * BAR, R3 = 4 * BAR, R4 = 5 * BAR, R5 = 6 * BAR;
export const RECRUIT_FRAMES = R5 + 75;
const PUNCH = 15;

/* Boot (ink): the punch card; the eighth stamp is punched out on the clack; the hole grows into lime (device 2). */
const CARD = { x: 90, y: 760, w: 900, h: 560 };
const stamp = (i: number) => ({ x: CARD.x + CARD.w - 140 - (i % 5) * 155, y: CARD.y + 300 + Math.floor(i / 5) * 140 });
const HOLE = stamp(7);
const Boot: React.FC = () => {
  const f = useCurrentFrame();
  const inY = snap(f, 0, 160, 0, 9);
  const v = Math.abs(snap(f, 0, 160, 0, 9) - snap(f - 1, 0, 160, 0, 9));
  const hole = f >= PUNCH ? snap(f, PUNCH, 0.4, 1, 6) : 0;
  const chip = snap(f, PUNCH, 0, 1, 10);
  const grow = accel(f, 47, 0, 1, 13);
  const push = drift(f, 9, 1, 1.03, 40);
  return (
    <Field k="ink">
      <Decode f={f} at={2} text="פרקו / גיוס עסקים - 2026" style={{ ...monoStyle(26, C.onInk), position: 'absolute', top: 470, right: 90 }} />
      <div style={{ position: 'absolute', top: 540, left: 60, right: 90 }}>
        <Letters text="עוד כרטיס ניקוב?" f={f} at={4} style={impactStyle(fit('עוד כרטיס ניקוב?', 150, 900), PAPER)} />
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translateY(${inY}px) scale(${push})`, transformOrigin: `${HOLE.x}px ${HOLE.y}px`, filter: v > 4 ? `blur(${Math.min(10, v / 6)}px)` : undefined }}>
        <div style={{ position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, background: '#FCFBF6', borderRadius: 34, boxShadow: '0 50px 90px -40px rgba(0,0,0,.6)' }}>
          <div style={{ position: 'absolute', top: 54, right: 60, fontFamily: impact, fontWeight: 800, fontSize: 52, color: INK, direction: 'rtl' }}>בית הקפה</div>
          <div style={{ position: 'absolute', top: 124, right: 60, ...monoStyle(24, MUTED) }}>כרטיס ניקוב · 10 חותמות = קפה</div>
          <div style={{ position: 'absolute', top: 64, left: 60, ...monoStyle(22, MUTED) }}>לדוגמה</div>
        </div>
        {Array.from({ length: 10 }, (_, i) => {
          const p = stamp(i);
          const isHole = i === 7;
          return (
            <div key={i} style={{ position: 'absolute', left: p.x - 46, top: p.y - 46, width: 92, height: 92, borderRadius: '50%',
              background: i < 7 ? INK : isHole && f >= PUNCH ? LIME : 'transparent', border: i >= 7 && !(isHole && f >= PUNCH) ? `4px solid ${INK}` : 'none',
              transform: isHole ? `scale(${f >= PUNCH ? hole : 1})` : undefined }} />
          );
        })}
        {f >= PUNCH && chip < 1 && (
          <Blur y={(1 - chip) * 30}>
            <div style={{ position: 'absolute', left: HOLE.x - 46, top: HOLE.y - 46 - chip * 260, width: 92, height: 92, borderRadius: '50%', background: '#FCFBF6', border: `4px solid ${INK}`, opacity: 1 - chip, transform: `rotate(${chip * -30}deg)` }} />
          </Blur>
        )}
      </div>
      <div style={{ position: 'absolute', left: HOLE.x - 46, top: HOLE.y - 46, width: 92, height: 92, borderRadius: '50%', background: LIME, transform: `scale(${f < 47 ? 0 : 1 + grow * 50})` }} />
    </Field>
  );
};

/* Title (lime): the question's answer; the street's baseline draws and blooms into the flash on the drop (device 1). */
const Title: React.FC = () => {
  const f = useCurrentFrame();
  const len = snap(f, 34, 0, 1, 9);
  const thick = accel(f, 48, 6, 160, 9);
  return (
    <Field k="lime">
      <Overline f={f} at={1} label="מאחורי החור" n="01" color={MUTED} top={560} />
      <div style={{ position: 'absolute', top: 680, left: 60, right: 90 }}>
        <Letters text="או שכונה" f={f} at={2} style={impactStyle(fit('או שכונה', 260), INK)} />
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}><WriteOn g={f} at={BEAT + 1} style={accentStyle(150, INK)}>שלמה.</WriteOn></div>
      </div>
      <div style={{ position: 'absolute', right: 0, top: 1320 - thick / 2, width: W * len, height: thick, background: f >= 48 ? '#FFFDF2' : INK, boxShadow: f >= 48 ? '0 0 120px 50px #FFFDF2' : undefined }} />
    </Field>
  );
};
const Flash: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: 'radial-gradient(80% 45% at 50% 69%, #FFFFFF 0%, #FCFBF6 70%)', opacity: interpolate(f, [0, 2, 4, 12], [0, 1, 1, 0], clamp), pointerEvents: 'none' }} />;
};

/* Street (paper): one word per beat over a street drawn in ink; every sign is a blank disc; the last lights lime and
   bursts into the next field (device 9). */
const SHOPS = [{ x: 1000, w: 300, h: 360 }, { x: 690, w: 270, h: 440 }, { x: 410, w: 260, h: 330 }, { x: 140, w: 250, h: 400 }];
const BASE = 1500;
const Street: React.FC = () => {
  const f = useCurrentFrame();
  const words = ['מחפשים', 'את', 'העסקים'];
  const k = Math.min(3, Math.floor(f / BEAT));
  const draw = (at: number, d = 9) => snap(f, at, 0, 1, d);
  const signAt = (i: number) => ({ x: SHOPS[i]!.x - SHOPS[i]!.w / 2, y: BASE - SHOPS[i]!.h + 110 });
  const lit = signAt(3), burst = snap(f, 48, 0, 1, 10), disc = accel(f, 50, 0, 1, 10);
  return (
    <Field k="paper">
      <div style={{ position: 'absolute', top: 470, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        {k < 3
          ? <Letters key={k} text={words[k]!} f={f} at={k * BEAT + 1} style={impactStyle(fit(words[k]!, 230), INK)} />
          : <WriteOn g={f} at={3 * BEAT + 1} style={accentStyle(170, INK)}>הראשונים.</WriteOn>}
      </div>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <line x1={W} y1={BASE} x2={0} y2={BASE} stroke={INK} strokeWidth={4} strokeDasharray={W} strokeDashoffset={W * (1 - draw(2))} />
        {SHOPS.map((s, i) => {
          const per = 2 * s.h + s.w, kk = draw(4 + i * 3, 10);
          const x0 = s.x, x1 = s.x - s.w, top = BASE - s.h;
          return (
            <g key={i} stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round">
              <path d={`M${x0} ${BASE} L${x0} ${top} L${x1} ${top} L${x1} ${BASE}`} strokeDasharray={per} strokeDashoffset={per * (1 - kk)} />
              <path d={`M${x0 - 36} ${BASE} L${x0 - 36} ${BASE - 150} L${x0 - 106} ${BASE - 150} L${x0 - 106} ${BASE}`} strokeDasharray={360} strokeDashoffset={360 * (1 - draw(9 + i * 3))} />
              <path d={`M${x0} ${top + 70} L${signAt(i).x} ${top + 70} L${signAt(i).x} ${signAt(i).y - 38}`} strokeDasharray={200} strokeDashoffset={200 * (1 - draw(12 + i * 3))} />
            </g>
          );
        })}
        {SHOPS.map((_, i) => {
          const p = signAt(i), s = snap(f, 14 + i * 3, 0, 1, 7);
          const on = i === 3 ? snap(f, 3 * BEAT, 0, 1, 6) : 0;
          return <circle key={i} cx={p.x} cy={p.y} r={38 * s} fill={on > 0 ? LIME : '#FCFBF6'} stroke={INK} strokeWidth={4} />;
        })}
        {f >= 48 && (
          <>
            <circle cx={lit.x} cy={lit.y} r={40 + burst * 700} fill="none" stroke={INK} strokeWidth={10 * (1 - burst) + 1} opacity={1 - burst} />
            {Array.from({ length: 12 }, (_, j) => {
              const a = (j / 12) * Math.PI * 2, r0 = 60 + burst * 260, r1 = r0 + 40 + burst * 120;
              return <line key={j} x1={lit.x + Math.cos(a) * r0} y1={lit.y + Math.sin(a) * r0} x2={lit.x + Math.cos(a) * r1} y2={lit.y + Math.sin(a) * r1} stroke={INK} strokeWidth={5} opacity={1 - burst} />;
            })}
            <circle cx={lit.x} cy={lit.y} r={disc * 2400} fill={INK} />
          </>
        )}
      </svg>
    </Field>
  );
};

/* Place (ink): where; a lime pin is the signal; horizontal slices bring in the tint field (device 5). */
const Place: React.FC = () => {
  const f = useCurrentFrame();
  const pin = snap(f, 3, 0, 1, 8);
  const pulse = (f % BEAT) / BEAT;
  return (
    <Field k="ink">
      <Overline f={f} at={1} label="איפה" n="02" color={C.onInk} top={560} />
      <div style={{ position: 'absolute', top: 700, left: 60, right: 90 }}>
        <Letters text="עמק רפאים" f={f} at={2} style={impactStyle(fit('עמק רפאים', 230), PAPER)} />
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}><WriteOn g={f} at={BEAT + 1} style={accentStyle(120, PAPER)}>ודרך בית לחם</WriteOn></div>
        <div style={{ marginTop: 40, display: 'flex', justifyContent: 'flex-end' }}><Decode f={f} at={2 * BEAT} text="ירושלים · פיילוט 2026" style={monoStyle(30, C.onInk)} /></div>
      </div>
      <div style={{ position: 'absolute', left: 150, top: 1360, width: 60, height: 60 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: LIME, transform: `scale(${pin})` }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `3px solid ${LIME}`, transform: `scale(${1 + pulse * 2.4})`, opacity: f > 10 ? 1 - pulse : 0 }} />
      </div>
      {f >= 52 && Array.from({ length: 10 }, (_, i) => {
        const p = snap(f, 52 + (i % 3), 0, 1, 5);
        const off = (1 - p) * (W * (0.6 + rnd(i * 7) * 0.6)) * (i % 2 ? 1 : -1);
        return <div key={i} style={{ position: 'absolute', left: off, top: (H / 10) * i, width: W, height: H / 10 + 1, background: C.tint }} />;
      })}
    </Field>
  );
};

/* Card (tint): one Perko card; eight places fill, two stay open; an open place opens into the join field (device 4). */
const PK = { x: 110, y: 640, w: 860, h: 640 };
const slot = (i: number) => ({ x: PK.x + PK.w - 130 - (i % 5) * 150, y: PK.y + 420 + Math.floor(i / 5) * 130 });
const OPEN = slot(9);
const CardScene: React.FC = () => {
  const f = useCurrentFrame();
  const inY = snap(f, 0, 220, 0, 9);
  const grow = accel(f, 46, 0, 1, 14);
  const word = snap(f, 47, 0.22, 1, 13);
  return (
    <Field k="tint">
      <div style={{ position: 'absolute', left: PK.x, top: PK.y, width: PK.w, height: PK.h, background: INK, borderRadius: 48, transform: `translateY(${inY}px)`, boxShadow: '0 50px 90px -40px rgba(17,19,15,.5)' }}>
        <div style={{ position: 'absolute', top: 50, left: 56, fontFamily: impact, fontWeight: 800, fontSize: 52, color: LIME, letterSpacing: '-0.055em', direction: 'ltr' }}>perk<span style={{ display: 'inline-block', width: 26, height: 26, borderRadius: 26, background: LIME, marginInlineStart: 4 }} /></div>
        <div style={{ position: 'absolute', top: 120, right: 60, left: 60 }}>
          <Letters text="יש מקום" f={f} at={6} style={impactStyle(118, PAPER)} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}><WriteOn g={f} at={BEAT + 2} style={accentStyle(92, LIME)}>גם לעסק שלך.</WriteOn></div>
        </div>
      </div>
      {Array.from({ length: 10 }, (_, i) => {
        const p = slot(i), filled = i < 8, s = snap(f, 8 + i * 2, 1.5, 1, 6), on = f >= 8 + i * 2;
        return (
          <div key={i} style={{ position: 'absolute', left: p.x - 46, top: p.y - 46 + inY, width: 92, height: 92, borderRadius: '50%',
            background: filled && on ? LIME : 'transparent', border: filled ? `3px solid ${on ? LIME : '#4A4F43'}` : `4px dashed ${LIME}`,
            opacity: filled ? 1 : 0.55 + 0.45 * Math.sin(f / 5), transform: filled ? `scale(${on ? s : 1})` : undefined }} />
        );
      })}
      <div style={{ position: 'absolute', top: PK.y + PK.h + 70, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Decode f={f} at={2 * BEAT} text="בחינם · בגישה מוקדמת · בלי התחייבות" style={monoStyle(32, MUTED)} />
      </div>
      {f >= 46 && (
        <>
          <div style={{ position: 'absolute', left: OPEN.x - 46 - grow * 1500, top: OPEN.y - 46 - grow * 2000, width: 92 + grow * 3000, height: 92 + grow * 4000, borderRadius: 46 * (1 - grow) + 2, background: LIME }} />
          <div style={{ position: 'absolute', top: JOIN_TOP, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${word})` }}>
            <Blur x={(1 - word) * 30}><JoinWord dot={1} /></Blur>
          </div>
        </>
      )}
    </Field>
  );
};

const HUD: HudScene[] = [
  { from: R1, to: R2, tag: 'שכונה / שלטים', dark: false },
  { from: R2, to: R3, tag: 'פיילוט / ירושלים', dark: true },
  { from: R3, to: R4, tag: 'מוצר / כרטיס', dark: false },
  { from: R4, to: R5, tag: 'קריאה לפעולה', dark: false },
];

export const PerkoReelRecruit: React.FC = () => (
  <AbsoluteFill style={{ background: INK }}>
    <Audio src={staticFile('recruit-score.wav')} volume={(f) => interpolate(f, [0, RECRUIT_FRAMES - 15, RECRUIT_FRAMES], [0.9, 0.9, 0], clamp)} />
    <Sequence from={0} durationInFrames={BAR}><Boot /></Sequence>
    <Sequence from={R0} durationInFrames={BAR}><Title /></Sequence>
    <Sequence from={R1} durationInFrames={BAR}><Street /></Sequence>
    <Sequence from={R2} durationInFrames={BAR}><Place /></Sequence>
    <Sequence from={R3} durationInFrames={BAR}><CardScene /></Sequence>
    <Sequence from={R4} durationInFrames={BAR}><Cta /></Sequence>
    <Sequence from={R5} durationInFrames={RECRUIT_FRAMES - R5}><End /></Sequence>
    <Sequence from={R1 - 3} durationInFrames={14}><Flash /></Sequence>
    <Hud916 scenes={HUD} label="פרקו - גיוס עסקים 2026" />
  </AbsoluteFill>
);
