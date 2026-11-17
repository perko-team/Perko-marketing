import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C } from '../tokens';
import { snap, accel, lin, rnd } from '../motion';
import { impact, mono } from '../fonts';
import { Blur } from '../components/Blur';
import { Whip, WriteOn, impactStyle, accentStyle } from '../components/Kinetic';
import { Field, Hud916, HudScene, monoStyle, clamp, fit, LIME, INK, PAPER, MUTED } from '../Reel';

// "החותמת האחרונה": a story reel, 9:16, 120 BPM (beat 15 f, bar 60 f), 13 s. Not the daily template: one object, a
// paper punch card, carries the story. Its empty tenth hole is the dot (Motion DNA §1.4): it opens the lime field,
// becomes the tap on the real app, lands as the last stamp and writes the wordmark. Brand: video-app/PROJECT_BRIEF.md.
// Everything that matters sits between y 380 and y 1560 (Instagram's caption and buttons cover the bottom).
export const BEAT = 15, BAR = 60;
const B = (bar: number, beat = 0) => bar * BAR + beat * BEAT;
export const STORY_FRAMES = B(6) + 30; // 6 bars + a still hold on the end card

const W = 1080;

/* ---------- the punch card ---------- */
const Card: React.FC<{ stamps: number; hole?: number; last?: number; width?: number; name?: string }> = ({ stamps, hole = 1, last = 0, width = 840, name = 'קפה פינה' }) => (
  <div style={{ width, background: '#FCFBF6', borderRadius: width * 0.055, padding: `${width * 0.05}px ${width * 0.06}px`, boxShadow: '0 50px 90px -40px rgba(0,0,0,.6)', direction: 'rtl', boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontFamily: impact, fontWeight: 800, fontSize: width * 0.065, color: INK }}>{name}</span>
      <span style={{ ...monoStyle(width * 0.027, 'rgba(17,19,15,.55)') }}>לדוגמה · 10 = קפה חינם</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: width * 0.03, marginTop: width * 0.045 }}>
      {Array.from({ length: 10 }, (_, i) => {
        const on = i < stamps, isLast = i === 9;
        const s = isLast && last > 0 ? 1 + (1 - last) * 0.9 : 1;
        return (
          <div key={i} style={{ aspectRatio: '1', borderRadius: '50%', position: 'relative',
            background: on || (isLast && last > 0) ? INK : 'transparent', transform: `scale(${s}) rotate(${(rnd(i) - 0.5) * 14}deg)`,
            border: on ? 'none' : isLast ? `${width * 0.008}px dashed ${LIME}` : `${width * 0.006}px dashed ${C.tintStrong}`,
            opacity: isLast && last === 0 ? hole : 1 }}>
            {(on || (isLast && last > 0)) && <span style={{ position: 'absolute', inset: '30%', borderRadius: '50%', background: isLast ? LIME : PAPER, opacity: isLast ? 1 : 0.9 }} />}
          </div>
        );
      })}
    </div>
  </div>
);

/* ---------- scene 1, hook (ink): one stamp missing ---------- */
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const y = (x: number) => snap(x, 2, 900, 0, 9);
  const pulse = 0.55 + 0.45 * Math.sin(f / 3);
  // exit: the empty hole grows into the lime field (punctuation -> mask, §8.2)
  const r = accel(f, 44, 0, 1500, 16);
  return (
    <Field k="ink">
      <div style={{ position: 'absolute', top: 420, right: 90, ...monoStyle(30, C.onInk) }}>17:42 · בקופה</div>
      <div style={{ position: 'absolute', top: 480, right: 90, transform: `scale(${snap(f, 0, 1.08, 1, 6)})`, transformOrigin: '100% 50%' }}>
        <div style={{ ...impactStyle(190, PAPER) }}>חותמת אחת</div>
        <div style={{ ...accentStyle(78, PAPER), marginTop: 26, opacity: snap(f, 3, 0, 1, 6) }}>חסרה לקפה חינם.</div>
      </div>
      <Blur y={Math.abs(y(f) - y(f - 1))} style={{ position: 'absolute', left: 120, top: 900, transform: `translateY(${y(f)}px) rotate(-4deg)` }}>
        <Card stamps={9} hole={pulse} />
      </Blur>
      {r > 0 && <div style={{ position: 'absolute', left: 120 + 840 * 0.1 - r, top: 1190 - r, width: r * 2, height: r * 2, borderRadius: '50%', background: LIME }} />}
    </Field>
  );
};

/* ---------- scene 2, the problem (lime): one word per beat ---------- */
const WORDS = ['אבל', 'הכרטיסייה', 'נשארה', 'בבית.'];
const Problem: React.FC = () => {
  const f = useCurrentFrame();
  const i = Math.min(3, Math.floor(f / BEAT));
  const w = WORDS[i]!;
  // exit: three diagonal slabs sweep up (slab wipe, §8.7), ink then paper
  const slab = (k: number) => accel(f, 46 + k * 2, 2600, -700, 12);
  return (
    <Field k="lime">
      <div style={{ position: 'absolute', top: 470, right: 90, ...monoStyle(30, MUTED) }}>{`0${i + 1} / 04`}</div>
      <div style={{ position: 'absolute', top: 760, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Whip key={i} g={f} at={i * BEAT} style={impactStyle(fit(w, 260, 920), INK)}>{w}</Whip>
      </div>
      {i === 3 && <div style={{ position: 'absolute', top: 1080, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <WriteOn g={f} at={B(0, 3) + 3} style={accentStyle(96, INK)}>שוב.</WriteOn>
      </div>}
      {[INK, PAPER, PAPER].map((c, k) => (
        <div key={k} style={{ position: 'absolute', left: -400, width: 1900, height: 900, top: slab(k), background: c, transform: 'rotate(-18deg)' }} />
      ))}
    </Field>
  );
};

/* ---------- scene 3, the wallet (paper): ten cards, none full ---------- */
const NAMES = ['המאפייה', 'הספרייה', 'המספרה', 'הפרחים', 'הפיצה', 'המכבסה', 'הירקן', 'הסושי', 'הגלידה', 'הקפה'];
const Wallet: React.FC = () => {
  const f = useCurrentFrame();
  const n = Math.round(interpolate(f, [2, 30], [1, 10], { ...clamp, easing: (t) => 1 - Math.pow(2, -10 * t) }));
  const out = accel(f, 48, 0, 1, 12); // exit: the cards collapse into one ink square (§8.10)
  return (
    <Field k="paper">
      {NAMES.map((nm, k) => {
        const a = snap(f, 2 + k * 2, 0, 1, 9);
        const ang = (k - 4.5) * 9 + Math.sin(f / 20 + k) * 1.2;
        const tx = Math.sin((ang * Math.PI) / 180) * 360 * a * (1 - out);
        const ty = (1 - Math.cos((ang * Math.PI) / 180)) * 500 * a * (1 - out);
        return (
          <div key={k} style={{ position: 'absolute', left: W / 2 - 230, top: 960, transform: `translate(${tx}px, ${ty}px) rotate(${ang * a * (1 - out)}deg) scale(${1 - out * 0.7})`, opacity: f < 2 + k * 2 ? 0 : 1 }}>
            <Card stamps={2 + ((k * 3) % 7)} width={460} name={nm} hole={0.35} />
          </div>
        );
      })}
      <div style={{ position: 'absolute', top: 420, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ ...impactStyle(330, INK), direction: 'ltr', fontFamily: mono, fontWeight: 500, letterSpacing: '-0.06em' }}>{n}</div>
        <div style={{ ...monoStyle(32, MUTED), marginTop: 10 }}>כרטיסיות בארנק · אף אחת לא מלאה</div>
      </div>
      {out > 0 && <div style={{ position: 'absolute', left: W / 2 - 130, top: 1010, width: 260, height: 260, borderRadius: 60, background: INK, opacity: out, boxShadow: `0 0 0 ${out * 14}px rgba(215,255,53,.5)` }} />}
    </Field>
  );
};

/* ---------- scene 4, the app (ink): the square opens into the real wallet ---------- */
const PW = 430, PH = PW * (892 / 412);
const App: React.FC = () => {
  const f = useCurrentFrame();
  const s = snap(f, 0, 0.42, 1, 10);
  const tap = lin(f, 30, 0, 1, 14);
  return (
    <Field k="ink">
      <div style={{ position: 'absolute', top: 420, right: 90 }}>
        <WriteOn g={f} at={4} style={accentStyle(86, PAPER)}>כולן בטלפון אחד.</WriteOn>
      </div>
      <div style={{ position: 'absolute', left: W / 2 - PW / 2, top: 590, width: PW, height: PH, transform: `scale(${s})`, transformOrigin: '50% 30%' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 70, padding: 14, background: '#2A2E24', boxSizing: 'border-box', boxShadow: '0 60px 120px -50px rgba(0,0,0,.8)' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 58, overflow: 'hidden', position: 'relative' }}>
            <Img src={staticFile('shots/wallet.png')} style={{ width: '100%', display: 'block' }} />
            {f >= 30 && <div style={{ position: 'absolute', left: 150 - 45, top: 270 - 45, width: 100, height: 100, borderRadius: '50%', border: `6px solid ${LIME}`, background: 'rgba(215,255,53,.3)', transform: `scale(${0.4 + tap})`, opacity: 1 - tap * 0.6 }} />}
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 530, right: 90, ...monoStyle(24, C.onInk), opacity: snap(f, 8, 0, 1, 6) }}>האפליקציה האמיתית · נתוני דוגמה</div>
    </Field>
  );
};

/* ---------- scene 5, full (lime): the last stamp lands ---------- */
const Full: React.FC = () => {
  const f = useCurrentFrame();
  const land = snap(f, BEAT, 0, 1, 7);
  // exit: the last stamp opens into ink rings that zoom to camera (portal, §8.11)
  const p = accel(f, 44, 0, 1, 16);
  return (
    <Field k="lime">
      <div style={{ position: 'absolute', left: 120, top: 520, transform: `rotate(3deg) translateY(${snap(f, 0, -140, 0, 8)}px)` }}>
        <Card stamps={9} last={land} />
      </div>
      <div style={{ position: 'absolute', top: 1010, right: 90 }}>
        {f >= BEAT && <div style={{ ...impactStyle(230, INK), transform: `scale(${snap(f, BEAT, 1.15, 1, 6)})`, transformOrigin: '100% 50%' }}>מלאה.</div>}
        <WriteOn g={f} at={B(0, 2)} style={{ ...accentStyle(84, INK), marginTop: 20 }}>והפעם, בלי לחפש.</WriteOn>
      </div>
      {p > 0 && [0, 1, 2, 3].map((k) => {
        const r = Math.max(0, p * 2600 - k * 260);
        return <div key={k} style={{ position: 'absolute', left: 120 + 840 * 0.13 - r, top: 860 - r, width: r * 2, height: r * 2, borderRadius: '50%', background: k % 2 ? '#1C1F18' : INK }} />;
      })}
    </Field>
  );
};

/* ---------- end card (ink): the dot writes the wordmark ---------- */
const End: React.FC = () => {
  const f = useCurrentFrame();
  const rev = snap(f, 4, 0, 1, 18);
  return (
    <Field k="ink">
      <div style={{ position: 'absolute', top: 760, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'baseline', fontFamily: impact, fontWeight: 800, fontSize: 220, letterSpacing: '-0.055em', lineHeight: 1, color: PAPER, direction: 'ltr', gap: '0.035em' }}>
          <span style={{ clipPath: `inset(-20% ${(1 - rev) * 100}% -20% -5%)` }}>perk</span>
          {/* the dot travels with the reveal's edge and settles as the "o" (dot-led reveal, §8.12) */}
          <span style={{ display: 'inline-block', width: '0.5em', height: '0.5em', borderRadius: '50%', background: LIME, boxShadow: '0 0 60px rgba(215,255,53,.55)', transform: `translate(${-(1 - rev) * 1.85}em, 0.015em)` }} />
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1060, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <WriteOn g={f} at={20} style={accentStyle(70, PAPER)}>כרטיסייה אחת לכל השכונה.</WriteOn>
      </div>
      <div style={{ position: 'absolute', top: 1200, left: 300, right: 300, height: 1, background: 'rgba(248,248,244,.35)', transform: `scaleX(${snap(f, 26, 0, 1, 10)})` }} />
      <div style={{ position: 'absolute', top: 1240, left: 0, right: 0, textAlign: 'center', ...monoStyle(30, C.onInk), opacity: snap(f, 30, 0, 1, 6) }}>לבעלי עסקים · גישה מוקדמת בחינם · הקישור בביו</div>
    </Field>
  );
};

/* ---------- sound: our 120 BPM loop + the CC0 kit (public/daily/kit) ---------- */
const Fx: React.FC<{ at: number; file: string; vol: number; len?: number }> = ({ at, file, vol, len = 60 }) => (
  <Sequence from={Math.max(0, at)} durationInFrames={len} layout="none"><Audio src={staticFile(`daily/kit/${file}.ogg`)} volume={vol} /></Sequence>
);

export const LastStamp: React.FC = () => {
  const music = (x: number) => interpolate(x, [0, B(5), STORY_FRAMES - 10, STORY_FRAMES], [0.6, 0.6, 0.45, 0], clamp);
  const hud: HudScene[] = [
    { from: B(1), to: B(2), tag: 'הבעיה', dark: false },
    { from: B(2), to: B(3), tag: 'הארנק', dark: false },
    { from: B(3), to: B(4), tag: 'פרקו / ארנק', dark: true },
    { from: B(4), to: B(5), tag: 'מימוש', dark: false },
  ];
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Audio src={staticFile('daily/music-1.wav')} volume={music} loop trimBefore={BAR} />
      <Sequence from={0} durationInFrames={BAR}><Hook /></Sequence>
      <Sequence from={B(1)} durationInFrames={BAR}><Problem /></Sequence>
      <Sequence from={B(2)} durationInFrames={BAR}><Wallet /></Sequence>
      <Sequence from={B(3)} durationInFrames={BAR}><App /></Sequence>
      <Sequence from={B(4)} durationInFrames={BAR}><Full /></Sequence>
      <Sequence from={B(5)} durationInFrames={STORY_FRAMES - B(5)}><End /></Sequence>
      <Hud916 scenes={hud} label="פרקו - סיפור" />
      {/* hits on the frames where things land */}
      <Fx at={0} file="impact" vol={0.35} />
      <Fx at={3} file="pop" vol={0.6} />
      {[1, 2, 3, 4, 5].map((k) => <Fx key={`w${k}`} at={B(k) - 3} file="whoosh" vol={0.45} />)}
      {[1, 2, 3].map((k) => <Fx key={`t${k}`} at={B(1, k)} file="tick" vol={0.5} />)}
      {Array.from({ length: 9 }, (_, k) => <Fx key={`c${k}`} at={B(2) + 4 + k * 3} file="click" vol={0.35} />)}
      <Fx at={B(3, 2)} file="ding" vol={0.3} />
      <Fx at={B(4, 1) - 2} file="impact" vol={0.4} />
      <Fx at={B(5) - 58} file="riser" vol={0.3} len={60} />
      <Fx at={B(5) + 22} file="pop" vol={0.6} />
    </AbsoluteFill>
  );
};
