import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { impact } from './fonts';
import { C } from './tokens';
import { snap, accel, rnd } from './motion';
import { Letters } from './components/Letters';
import { Whip, WriteOn, impactStyle, accentStyle } from './components/Kinetic';
import {
  W, H, BEAT, BAR, LIME, INK, PAPER, MUTED, RAISED, clamp, fit, Field, monoStyle, Overline, Decode,
  Identity, Journey, Offer, Cta, End, Hud916, HudScene,
} from './Reel';

// Reel 2, "the message": the hook is a customer's message on a lock screen. Motion DNA, 120 BPM, 60 f per scene.
// Boot (message) -> title ("how many times have you heard that?") flashes on the drop (f120) -> identity -> the reply
// -> "no paper" kinetic type -> the business journey -> free -> join -> end card.
const B1 = BAR, B2 = 2 * BAR, B3 = 3 * BAR, B4 = 4 * BAR, B5 = 5 * BAR, B6 = 6 * BAR, B7 = 7 * BAR, B8 = 8 * BAR;
export const MESSAGE_FRAMES = B8 + 75;

/** A neutral notification card (not any real messaging app). */
export const Notice: React.FC<{ from: string; children: React.ReactNode; style?: React.CSSProperties; light?: boolean }> = ({ from, children, style, light }) => (
  <div style={{ width: 920, background: light ? PAPER : RAISED, color: light ? INK : PAPER, borderRadius: 40, padding: '34px 40px', direction: 'rtl', fontFamily: impact, boxShadow: '0 40px 80px -30px rgba(0,0,0,.6)', ...style }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, ...monoStyle(24, light ? MUTED : C.onInk) }}>
      <span style={{ width: 54, height: 54, borderRadius: 16, background: LIME, display: 'grid', placeItems: 'center' }}>
        <span style={{ width: 20, height: 20, borderRadius: 20, background: INK }} />
      </span>
      <span>{from}</span><span style={{ marginInlineStart: 'auto' }}>עכשיו</span>
    </div>
    <div style={{ marginTop: 22, fontSize: 52, fontWeight: 700, lineHeight: 1.3 }}>{children}</div>
  </div>
);

/* Boot (ink): the message arrives; its lime app dot grows into the title field (device 2, a dot as the mask). */
const Boot: React.FC = () => {
  const f = useCurrentFrame();
  const y = snap(f, 4, -260, 0, 9);
  const v = Math.abs(snap(f, 4, -260, 0, 9) - snap(f - 1, 4, -260, 0, 9));
  const typing = f >= 14 && f < 28;
  const mask = accel(f, 48, 0, 1, 12);
  return (
    <Field k="ink">
      <Decode f={f} at={1} text="הודעה חדשה" style={{ ...monoStyle(26, C.onInk), position: 'absolute', top: 460, right: 80 }} />
      <div style={{ position: 'absolute', top: 540, left: 80, transform: `translateY(${y}px)`, opacity: f < 4 ? 0 : 1, filter: v > 3 ? `blur(${Math.min(12, v / 4)}px)` : undefined }}>
        <Notice from="לקוח קבוע">
          {typing ? (
            <span style={{ display: 'flex', gap: 14, height: 68, alignItems: 'center' }}>
              {[0, 1, 2].map((i) => <span key={i} style={{ width: 18, height: 18, borderRadius: 18, background: C.onInk, opacity: 0.4 + 0.6 * ((Math.floor(f / 3) + i) % 3 === 0 ? 1 : 0) }} />)}
            </span>
          ) : f >= 28 ? (
            <>
              <Letters text="היי, הכרטיס ניקוב שלי נשאר בבית." f={f} at={28} stagger={0.5} style={{ fontSize: 52, fontWeight: 700 }} />
              <Letters text="אפשר בכל זאת חותמת?" f={f} at={38} stagger={0.5} style={{ fontSize: 52, fontWeight: 700 }} />
            </>
          ) : null}
        </Notice>
      </div>
      <div style={{ position: 'absolute', left: 80 + 920 - 40 - 54 + 27 - 70, top: 540 + 34 + 27 - 70, width: 140, height: 140, borderRadius: '50%', background: LIME, transform: `scale(${f < 48 ? 0 : 0.2 + mask * 30})` }} />
    </Field>
  );
};

/* Title (lime): one question; its underline draws, then blooms into the flash on the drop (device 1). */
const Title: React.FC = () => {
  const f = useCurrentFrame();
  const line = snap(f, 30, 0, 1, 8);
  const thick = accel(f, 48, 8, 120, 7);
  return (
    <Field k="lime">
      <div style={{ position: 'absolute', top: 640, left: 60, right: 90 }}>
        <Letters text="כמה פעמים" f={f} at={2} style={impactStyle(fit('כמה פעמים', 260), INK)} />
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}><WriteOn g={f} at={BEAT + 1} style={accentStyle(120, INK)}>שמעת את זה?</WriteOn></div>
        <div style={{ marginTop: 26, marginInlineStart: 'auto', width: 620 * line, height: thick, background: f >= 48 ? '#FFFDF2' : INK, borderRadius: thick, marginRight: 0, boxShadow: f >= 48 ? '0 0 80px 30px #FFFDF2' : undefined }} />
      </div>
    </Field>
  );
};
const Flash: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: 'radial-gradient(70% 50% at 50% 50%, #FFFDF2 0%, #F4FFB8 60%, #D7FF35 100%)', opacity: interpolate(f, [0, 3, 5, 14], [0, 1, 1, 0], clamp), pointerEvents: 'none' }} />;
};

/* Reply (paper): the business answers; slab wipe into lime (device 7). */
const Reply: React.FC = () => {
  const f = useCurrentFrame();
  const bubble = (at: number) => ({ opacity: f < at ? 0 : 1, transform: `translateY(${snap(f, at, 120, 0, 8)}px)` });
  const fill = f >= 34;
  const e = accel(f, 51, W + 900, -900, 9);
  return (
    <Field k="paper">
      <Overline f={f} at={1} label="התשובה שלכם" n="02" color={MUTED} top={420} />
      <div style={{ position: 'absolute', top: 540, left: 70, width: 760, background: C.tint, borderRadius: '40px 40px 40px 12px', padding: '30px 38px', fontFamily: impact, fontSize: 48, fontWeight: 600, color: INK, direction: 'rtl', ...bubble(2) }}>הכרטיס ניקוב נשאר בבית...</div>
      <div style={{ position: 'absolute', top: 760, right: 70, width: 800, background: INK, borderRadius: '40px 40px 12px 40px', padding: '30px 38px', fontFamily: impact, fontSize: 52, fontWeight: 800, color: PAPER, direction: 'rtl', ...bubble(BEAT + 1) }}>
        אין בעיה. <span style={{ color: LIME }}>הכרטיס כבר בטלפון.</span>
      </div>
      <div style={{ position: 'absolute', top: 1040, right: 70, width: 800, background: '#FFFFFF', borderRadius: 32, padding: '28px 34px', direction: 'rtl', boxShadow: '0 24px 50px -24px rgba(17,19,15,.35)', ...bubble(2 * BEAT) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', ...monoStyle(22, MUTED) }}><span>קפה פינה · לדוגמה</span><span>{fill ? '10/10' : '9/10'}</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 12, marginTop: 20 }}>
          {Array.from({ length: 10 }, (_, i) => <i key={i} style={{ aspectRatio: '1', borderRadius: '50%', border: `4px solid ${INK}`, background: i < 9 || fill ? INK : 'transparent', transform: i === 9 ? `scale(${snap(f, 34, 1.7, 1, 6)})` : undefined }} />)}
        </div>
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

/* No paper (lime): one word group per beat, the accent resolves; columns drop into ink (device 8). */
const NoPaper: React.FC = () => {
  const f = useCurrentFrame();
  const words = ['בלי נייר.', 'בלי לשכוח.', 'בלי עוד אפליקציה.'];
  const k = Math.min(3, Math.floor(f / BEAT));
  return (
    <Field k="lime">
      <Overline f={f} at={1} label="לקוחות" n="03" color={MUTED} top={560} />
      <div style={{ position: 'absolute', top: 760, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        {k < 3
          ? <Whip key={k} g={f} at={k * BEAT + 1} style={impactStyle(fit(words[k], 220), INK)}>{words[k]}</Whip>
          : <WriteOn g={f} at={3 * BEAT + 1} style={accentStyle(190, INK)}>רק סורקים.</WriteOn>}
      </div>
      {f >= 50 && Array.from({ length: 9 }, (_, i) => {
        const p = accel(f, 50 + rnd(i * 13) * 4, 0, 1, 7);
        return <div key={i} style={{ position: 'absolute', left: (W / 9) * i, top: -H + p * H, width: W / 9 + 1, height: H, background: INK }} />;
      })}
    </Field>
  );
};

const HUD: HudScene[] = [
  { from: B2, to: B3, tag: 'זהות / מותג', dark: true },
  { from: B3, to: B4, tag: 'שיחה / לקוח', dark: false },
  { from: B4, to: B5, tag: 'טיפוגרפיה בתנועה', dark: false },
  { from: B5, to: B6, tag: 'לעסקים / מסע', dark: true },
  { from: B6, to: B7, tag: 'הצעה / גישה מוקדמת', dark: false },
  { from: B7, to: B8, tag: 'קריאה לפעולה', dark: false },
];

export const PerkoReelMessage: React.FC = () => (
  <AbsoluteFill style={{ background: INK }}>
    <Audio src={staticFile('music.wav')} volume={(f) => interpolate(f, [0, MESSAGE_FRAMES - 20, MESSAGE_FRAMES], [0.9, 0.9, 0], clamp)} />
    <Sequence from={0} durationInFrames={BAR}><Boot /></Sequence>
    <Sequence from={B1} durationInFrames={BAR}><Title /></Sequence>
    <Sequence from={B2} durationInFrames={BAR}><Identity /></Sequence>
    <Sequence from={B3} durationInFrames={BAR}><Reply /></Sequence>
    <Sequence from={B4} durationInFrames={BAR}><NoPaper /></Sequence>
    <Sequence from={B5} durationInFrames={BAR}><Journey /></Sequence>
    <Sequence from={B6} durationInFrames={BAR}><Offer /></Sequence>
    <Sequence from={B7} durationInFrames={BAR}><Cta /></Sequence>
    <Sequence from={B8} durationInFrames={MESSAGE_FRAMES - B8}><End /></Sequence>
    <Sequence from={B2 - 5} durationInFrames={16}><Flash /></Sequence>
    <Hud916 scenes={HUD} label="פרקו - לעסקים 2026" />
  </AbsoluteFill>
);
