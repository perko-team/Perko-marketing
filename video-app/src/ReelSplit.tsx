import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C } from './tokens';
import { snap, accel } from './motion';
import { Whip, WriteOn, impactStyle, accentStyle } from './components/Kinetic';
import { Letters } from './components/Letters';
import {
  W, H, BEAT, BAR, LIME, INK, PAPER, MUTED, clamp, fit, Field, monoStyle, Decode,
  Punch, Club, AppTile, Receipt, Card, Journey, Offer, Cta, End, Hud916, HudScene,
} from './Reel';

// Reel 3, "before / after": the screen is split by a line for the first half of the piece, then the "after" side wins.
// Boot (the line draws) -> split title, the line flashes on the drop (f120) -> four before/after pairs, one per two beats
// -> the divider collapses up and the lime side takes the frame -> card -> journey -> free -> join -> end card.
const MID = 960;
const A1 = BAR, A2 = 2 * BAR, A3 = 4 * BAR, A4 = 5 * BAR, A5 = 6 * BAR, A6 = 7 * BAR, A7 = 8 * BAR;
export const SPLIT_FRAMES = A7 + 75;

/* Boot (ink): a lime dot draws the divider; it opens into two fields (device: the line becomes the split). */
const Boot: React.FC = () => {
  const f = useCurrentFrame();
  const len = snap(f, 8, 0, 1, 10);
  const open = accel(f, 48, 0, 1, 12);
  return (
    <Field k="ink">
      <Decode f={f} at={1} text="לפני ------ אחרי" style={{ ...monoStyle(30, C.onInk), position: 'absolute', top: 640, right: 90 }} />
      <div style={{ position: 'absolute', top: MID - 4, right: 60, width: (W - 120) * len, height: 8, background: LIME, borderRadius: 8 }} />
      <div style={{ position: 'absolute', top: MID - 16, right: 60 + (W - 120) * len - 16, width: 32, height: 32, borderRadius: 32, background: LIME, boxShadow: `0 0 40px ${LIME}` }} />
      <div style={{ position: 'absolute', top: MID - 90, right: 90, ...monoStyle(30, PAPER), opacity: f >= 24 ? 1 : 0 }}>היום</div>
      <div style={{ position: 'absolute', top: MID + 50, right: 90, ...monoStyle(30, LIME), opacity: f >= 30 ? 1 : 0 }}>עם פרקו</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: MID - MID * open, height: MID * open, background: C.tint }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: MID, height: (H - MID) * open, background: LIME }} />
    </Field>
  );
};

/* Split title: many cards above, one card below; the divider flashes on the drop (device 1). */
const SplitTitle: React.FC = () => {
  const f = useCurrentFrame();
  const pop = (at: number, r: number): React.CSSProperties => ({ opacity: f < at ? 0 : 1, transform: `rotate(${r}deg) scale(${snap(f, at, 1.3, 0.62, 7)})` });
  const thick = accel(f, 48, 8, 140, 8);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: MID, background: C.tint, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 260, right: 90 }}><Letters text="כרטיס לכל עסק." f={f} at={2} style={impactStyle(fit('כרטיס לכל עסק.', 150), INK)} /></div>
        <Punch style={{ left: -60, top: 440, ...pop(10, -10) }} />
        <Club style={{ left: 280, top: 520, ...pop(12, 6) }} />
        <AppTile style={{ left: 560, top: 420, ...pop(14, -4) }} />
        <Receipt style={{ left: 120, top: 650, ...pop(16, 9) }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: MID, bottom: 0, background: LIME }}>
        <div style={{ position: 'absolute', top: 160, right: 90 }}><Letters text="כרטיס אחד." f={f} at={BEAT + 2} style={impactStyle(fit('כרטיס אחד.', 200), INK)} /></div>
        <div style={{ position: 'absolute', top: 420, right: 90 }}><WriteOn g={f} at={2 * BEAT} style={accentStyle(72, INK)}>לכל העסקים בשכונה</WriteOn></div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: MID - thick / 2, height: thick, background: f >= 48 ? '#FFFDF2' : INK, boxShadow: f >= 48 ? '0 0 120px 40px #FFFDF2' : undefined }} />
    </AbsoluteFill>
  );
};
const Flash: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: 'radial-gradient(80% 40% at 50% 50%, #FFFDF2 0%, #F4FFB8 60%, #D7FF35 100%)', opacity: interpolate(f, [0, 3, 5, 14], [0, 1, 1, 0], clamp), pointerEvents: 'none' }} />;
};

/* Pairs (ink above, lime below): one pair per two beats; then the divider collapses up and lime wins. */
const Pairs: React.FC = () => {
  const f = useCurrentFrame();
  const pairs = [['שוכחים את הכרטיס', 'הכרטיס בטלפון'], ['מחפשים בארנק', 'סורקים בקופה'], ['ניקוב שהלך לאיבוד', 'חותמת שנשמרת'], ['עוד אפליקציה', 'אפליקציה אחת']];
  const k = Math.min(3, Math.floor(f / (2 * BEAT)));
  const t0 = k * 2 * BEAT;
  const strike = snap(f, t0 + 12, 0, 1, 8);
  const mid = MID - accel(f, 106, 0, MID, 14);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: mid, background: INK, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 300, right: 90, ...monoStyle(26, C.onInk) }}>היום</div>
        <div style={{ position: 'absolute', top: 520, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Whip key={`a${k}`} g={f} at={t0 + 1} style={impactStyle(fit(pairs[k][0], 130), PAPER)}>{pairs[k][0]}</Whip>
            <div style={{ position: 'absolute', right: 0, top: '52%', width: `${strike * 100}%`, height: 10, background: PAPER, opacity: 0.85 }} />
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: mid, bottom: 0, background: LIME }}>
        <div style={{ position: 'absolute', top: 120, right: 90, ...monoStyle(26, MUTED) }}>עם פרקו</div>
        <div style={{ position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <Whip key={`b${k}`} g={f} at={t0 + 7} style={impactStyle(fit(pairs[k][1], 140), INK)}>{pairs[k][1]}</Whip>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: mid - 3, height: 6, background: PAPER, opacity: 0.9 }} />
      <div style={{ position: 'absolute', top: mid + 520, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 18 }}>
        {[0, 1, 2, 3].map((i) => <span key={i} style={{ width: 120, height: 8, borderRadius: 8, background: i <= k ? INK : 'rgba(17,19,15,.2)' }} />)}
      </div>
    </AbsoluteFill>
  );
};

const HUD: HudScene[] = [
  { from: A2, to: A3, tag: 'לפני / אחרי', dark: true, bottomDark: false },
  { from: A3, to: A4, tag: 'מוצר / כרטיס', dark: false },
  { from: A4, to: A5, tag: 'לעסקים / מסע', dark: true },
  { from: A5, to: A6, tag: 'הצעה / גישה מוקדמת', dark: false },
  { from: A6, to: A7, tag: 'קריאה לפעולה', dark: false },
];

export const PerkoReelSplit: React.FC = () => (
  <AbsoluteFill style={{ background: INK }}>
    <Audio src={staticFile('music.wav')} volume={(f) => interpolate(f, [0, SPLIT_FRAMES - 20, SPLIT_FRAMES], [0.9, 0.9, 0], clamp)} />
    <Sequence from={0} durationInFrames={BAR}><Boot /></Sequence>
    <Sequence from={A1} durationInFrames={BAR}><SplitTitle /></Sequence>
    <Sequence from={A2} durationInFrames={2 * BAR}><Pairs /></Sequence>
    <Sequence from={A3} durationInFrames={BAR}><Card /></Sequence>
    <Sequence from={A4} durationInFrames={BAR}><Journey /></Sequence>
    <Sequence from={A5} durationInFrames={BAR}><Offer /></Sequence>
    <Sequence from={A6} durationInFrames={BAR}><Cta /></Sequence>
    <Sequence from={A7} durationInFrames={SPLIT_FRAMES - A7}><End /></Sequence>
    <Sequence from={A2 - 5} durationInFrames={16}><Flash /></Sequence>
    <Hud916 scenes={HUD} label="פרקו - לעסקים 2026" />
  </AbsoluteFill>
);
