import React from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';
import { impact } from './fonts';
import { Wordmark } from './components/Wordmark';

// Vertical reel for business owners (1080x1920, 20 s, 120 BPM: beat = 15 frames).
// The hook runs on the music's intro and the cards collapse into the stamp exactly on the drop (4.0 s).
// Safe zones: key content stays between y = 250 and y = 1580 (Instagram UI covers the rest).
const LIME = '#D7FF35', INK = '#11130F', PAPER = '#F8F8F4', MUTED = '#303626', RAISED = '#1F221B';
const FPS = 30;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const sp = (f: number, at: number, damping = 13, stiffness = 170) => spring({ frame: f - at, fps: FPS, config: { damping, stiffness } });

/** A word or line that slams in: big overshoot scale, quick fade. */
const Slam: React.FC<{ at: number; size: number; color: string; weight?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, size, color, weight = 900, children, style }) => {
  const f = useCurrentFrame();
  const s = sp(f, at, 11, 220);
  return (
    <div style={{ fontFamily: impact, fontWeight: weight, fontSize: size, lineHeight: 1.02, letterSpacing: '-0.035em', color, direction: 'rtl', opacity: interpolate(f - at, [0, 3], [0, 1], clamp), transform: `scale(${interpolate(s, [0, 1], [1.7, 1])})`, transformOrigin: 'center', ...style }}>
      {children}
    </div>
  );
};

const Center: React.FC<{ bg: string; children: React.ReactNode }> = ({ bg, children }) => (
  <AbsoluteFill style={{ background: bg, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>{children}</AbsoluteFill>
);

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

/* --- 0 to 7.3 s: the supplied clip (needle, balloon, countdown to impact) with the hook line on top --- */
const CLIP = 218; // frames, the clip's length
const ClipHook: React.FC = () => {
  const f = useCurrentFrame();
  const line = (from: number, to: number) => ({ opacity: interpolate(f, [from, from + 6, to - 4, to], [0, 1, 1, 0], clamp), transform: `translateY(${interpolate(f, [from, from + 8], [30, 0], clamp)}px)` });
  const text: React.CSSProperties = { position: 'absolute', left: 90, right: 90, top: 300, fontFamily: impact, fontWeight: 900, fontSize: 92, lineHeight: 1.08, letterSpacing: '-0.03em', color: PAPER, direction: 'rtl', textAlign: 'center', textShadow: '0 4px 24px rgba(0,0,0,.6)' };
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <OffthreadVideo src={staticFile('hook.mp4')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} volume={(fr) => interpolate(fr, [0, CLIP - 10, CLIP], [1, 1, 0], clamp)} />
      <div style={{ ...text, ...line(10, 104) }}>הכרטיס של הלקוח<br />הכי נאמן שלך</div>
      <div style={{ ...text, color: LIME, ...line(110, CLIP + 1) }}>עומד להיעלם.</div>
    </AbsoluteFill>
  );
};

/* --- the pop: the old cards burst out of the impact, then fall into one stamp on the music's drop --- */
const Burst: React.FC = () => {
  const f = useCurrentFrame();
  const flash = interpolate(f, [0, 4], [1, 0], clamp);
  const suck = interpolate(f, [38, 50], [0, 1], clamp);
  const fly = (at: number, x: number, y: number, r: number): React.CSSProperties => {
    const p = sp(f, at, 12, 230);
    const cx = 540 - 280, cy = 960 - 120;
    const px = cx + (x - cx) * p, py = cy + (y - cy) * p;
    return { left: px + (cx - px) * suck, top: py + (cy - py) * suck, transform: `rotate(${r * p * (1 - suck)}deg) scale(${interpolate(p, [0, 1], [0.2, 1]) * (1 - suck * 0.9)})`, opacity: interpolate(p, [0, 0.15], [0, 1], clamp) * (1 - suck) };
  };
  const disc = interpolate(f, [44, 58], [0, 26], clamp);
  return (
    <Center bg={LIME}>
      <Punch style={fly(0, 90, 420, -12)} />
      <Club style={fly(1, 440, 700, 9)} />
      <AppTile style={fly(2, 60, 1080, -6)} />
      <Receipt style={fly(3, 560, 1300, 11)} />
      <div style={{ position: 'absolute', top: 250, left: 80, right: 80, opacity: 1 - suck }}><Slam at={6} size={96} color={INK}>כל עסק, כרטיס אחר.</Slam></div>
      <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: INK, left: 440, top: 860, transform: `scale(${disc})` }} />
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
    </Center>
  );
};

/* --- one card for the whole street --- */
const OneCard: React.FC = () => {
  const f = useCurrentFrame();
  const mark = sp(f, 0, 14, 160);
  const rows = [['קפה פינה', '7/10'], ['מעדניית השוק', '3/8'], ['זעתר', '4/6'], ['מאפיית הגפן', '5/8']];
  return (
    <AbsoluteFill style={{ background: INK, alignItems: 'center' }}>
      <div style={{ marginTop: 300, transform: `scale(${interpolate(mark, [0, 1], [0.6, 1])})`, opacity: mark }}><Wordmark size={190} color={LIME} disc={LIME} /></div>
      <div style={{ marginTop: 70 }}><Slam at={18} size={110} color={LIME}>כרטיס אחד</Slam></div>
      <div style={{ marginTop: 6 }}><Slam at={28} size={72} color={PAPER} weight={700}>לכל העסקים בשכונה.</Slam></div>
      <div style={{ marginTop: 70, width: 820, display: 'grid', gap: 18 }}>
        {rows.map(([n, v], i) => {
          const s = sp(f, 38 + i * 7, 14, 200);
          return (
            <div key={n} style={{ background: PAPER, borderRadius: 22, padding: '22px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: impact, direction: 'rtl', fontSize: 40, fontWeight: 800, color: INK, opacity: s, transform: `translateY(${interpolate(s, [0, 1], [80, 0])}px)` }}>
              <span>{n}</span><span style={{ direction: 'ltr', fontWeight: 600, color: MUTED }}>{v}</span>
            </div>
          );
        })}
        <div style={{ fontFamily: impact, fontSize: 26, color: '#B9BCB0', textAlign: 'center', opacity: interpolate(f, [70, 78], [0, 1], clamp) }}>שמות לדוגמה</div>
      </div>
    </AbsoluteFill>
  );
};

/* --- 8 to 12 s: the stamps land --- */
const Stamps: React.FC = () => {
  const f = useCurrentFrame();
  const done = sp(f, 92, 10, 220);
  const card = sp(f, 4, 14, 170);
  return (
    <AbsoluteFill style={{ background: LIME, alignItems: 'center' }}>
      <div style={{ marginTop: 300 }}><Slam at={0} size={124} color={INK}>הלקוחות חוזרים.</Slam></div>
      <div style={{ marginTop: 80, width: 880, background: PAPER, borderRadius: 40, padding: 50, fontFamily: impact, direction: 'rtl', textAlign: 'right', transform: `translateY(${interpolate(card, [0, 1], [200, 0])}px) rotate(${f >= 92 && f < 104 ? Math.sin(f * 2) * 2 : 0}deg)`, opacity: card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 40, fontWeight: 800, color: INK }}><span>קפה פינה</span><span style={{ fontSize: 26, fontWeight: 600, color: MUTED }}>לדוגמה</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 24, marginTop: 40 }}>
          {Array.from({ length: 10 }, (_, i) => {
            const s = sp(f, 18 + i * 8, 9, 260);
            return <div key={i} style={{ aspectRatio: '1', borderRadius: '50%', border: `5px solid ${INK}`, position: 'relative' }}><div style={{ position: 'absolute', inset: -5, borderRadius: '50%', background: INK, transform: `scale(${interpolate(s, [0, 1], [2.2, 1])})`, opacity: interpolate(f - 18 - i * 8, [0, 2], [0, 1], clamp) }} /></div>;
          })}
        </div>
      </div>
      <div style={{ marginTop: 60, background: INK, color: LIME, borderRadius: 999, padding: '24px 56px', fontFamily: impact, fontSize: 64, fontWeight: 900, transform: `scale(${interpolate(done, [0, 1], [0, 1])})` }}>ההטבה מוכנה.</div>
    </AbsoluteFill>
  );
};

/* --- 12 to 16 s: the journey, one step per bar half --- */
const Journey: React.FC = () => {
  const f = useCurrentFrame();
  const steps = ['נרשמים בחינם.', 'מגדירים את ההטבה.', 'מציבים קוד בקופה.', 'הלקוחות צוברים.'];
  const cur = Math.min(steps.length - 1, Math.floor(f / 30));
  return (
    <AbsoluteFill style={{ background: PAPER, alignItems: 'center' }}>
      <div style={{ marginTop: 300, fontFamily: impact, fontSize: 40, fontWeight: 700, color: MUTED, direction: 'rtl' }}>המסע של עסק</div>
      <div key={cur} style={{ marginTop: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 50 }}>
        <div style={{ width: 200, height: 200, borderRadius: '50%', background: INK, color: LIME, display: 'grid', placeItems: 'center', fontFamily: impact, fontSize: 110, fontWeight: 900, transform: `scale(${interpolate(sp(f, cur * 30, 10, 240), [0, 1], [0.2, 1])})` }}>{cur + 1}</div>
        <Slam at={cur * 30 + 2} size={104} color={INK} style={{ maxWidth: 900 }}>{steps[cur]}</Slam>
      </div>
      <div style={{ position: 'absolute', top: 1500, display: 'grid', gridTemplateColumns: 'repeat(4, 160px)', gap: 16 }}>
        {steps.map((_, i) => <div key={i} style={{ height: 14, borderRadius: 7, background: i <= cur ? INK : '#D8DACE' }} />)}
      </div>
    </AbsoluteFill>
  );
};

/* --- 16 to 18 s: the offer --- */
const Offer: React.FC = () => (
  <Center bg={INK}>
    <Slam at={0} size={260} color={LIME}>בחינם.</Slam>
    <div style={{ marginTop: 30 }}><Slam at={20} size={100} color={PAPER}>בלי התחייבות.</Slam></div>
  </Center>
);

/* --- 18 to 20 s: the end card (the music's groove stops here, the bell lands on the wordmark) --- */
const End: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Center bg={LIME}>
      <Wordmark size={230} color={INK} disc={INK} reveal={interpolate(f, [0, 14], [0, 1], clamp)} hideDisc={f < 14} />
      <div style={{ marginTop: 70 }}><Slam at={20} size={78} color={INK}>הצטרפו לגישה המוקדמת</Slam></div>
      <div style={{ marginTop: 26 }}><Slam at={32} size={46} color={MUTED} weight={600}>הקישור בביו</Slam></div>
    </Center>
  );
};

// Timeline (frames): clip 0-218, pop 218-278, one card 278-368, stamps 368-473, journey 473-593, offer 593-638, end 638-698.
// The score enters at the cut with its drop on the pop (music 3.9 s = frame 117), and its groove stops as the end card starts.
export const REEL_FRAMES = 698;
export const PerkoReel: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={CLIP - 3}>
      <Audio src={staticFile('music.wav')} startFrom={117} volume={(f) => interpolate(f, [0, 455, 483], [0.9, 0.9, 0], clamp)} />
    </Sequence>
    <Sequence from={0} durationInFrames={CLIP}><ClipHook /></Sequence>
    <Sequence from={CLIP} durationInFrames={60}><Burst /></Sequence>
    <Sequence from={278} durationInFrames={90}><OneCard /></Sequence>
    <Sequence from={368} durationInFrames={105}><Stamps /></Sequence>
    <Sequence from={473} durationInFrames={120}><Journey /></Sequence>
    <Sequence from={593} durationInFrames={45}><Offer /></Sequence>
    <Sequence from={638} durationInFrames={60}><End /></Sequence>
  </AbsoluteFill>
);
