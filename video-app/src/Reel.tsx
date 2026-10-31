import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';
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

/* --- 0 to 4 s: the hook --- */
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const enter = sp(f, 0, 12, 200);
  const shake = f >= 30 && f < 46 ? Math.sin(f * 2.4) * 14 : 0;
  const fall = interpolate(f, [46, 66], [0, 1], clamp);
  const words = ['הלקוח', 'הכי', 'נאמן', 'שלך'];
  return (
    <Center bg={LIME}>
      <div style={{ position: 'absolute', top: 290, width: '100%', display: 'flex', justifyContent: 'center', gap: 26, direction: 'rtl' }}>
        {words.map((w, i) => <Slam key={w} at={i * 5} size={112} color={INK}>{w}</Slam>)}
      </div>
      <div style={{ position: 'absolute', top: 430, width: '100%' }}><Slam at={28} size={112} color={INK}>שכח את הכרטיס.</Slam></div>
      <Punch style={{ left: 260, top: 820, transform: `translate(${shake}px, ${fall * 1100}px) rotate(${interpolate(enter, [0, 1], [-14, -4]) + fall * 70}deg) scale(${interpolate(enter, [0, 1], [1.5, 1])})` }} />
    </Center>
  );
};
const Again: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Center bg={INK}>
      <Slam at={0} size={380} color={LIME}>שוב.</Slam>
      <div style={{ position: 'absolute', bottom: 480, left: 110, right: 110, fontFamily: impact, fontSize: 58, fontWeight: 700, lineHeight: 1.25, color: PAPER, direction: 'rtl', opacity: interpolate(f, [8, 14], [0, 1], clamp), transform: `translateY(${interpolate(f, [8, 14], [24, 0], clamp)}px)` }}>
        כל עסק עם כרטיס אחר.<br />וכולם נשכחים בבית.
      </div>
    </Center>
  );
};
const Barrage: React.FC = () => {
  const f = useCurrentFrame();
  const pop = (at: number) => sp(f, at, 12, 240);
  const suck = interpolate(f, [20, 30], [0, 1], clamp);
  const place = (at: number, x: number, y: number, r: number): React.CSSProperties => {
    const p = pop(at);
    return { left: x + (540 - x - 280) * suck, top: y + (960 - y - 120) * suck, transform: `rotate(${r * (1 - suck)}deg) scale(${interpolate(p, [0, 1], [0.3, 1]) * (1 - suck * 0.9)})`, opacity: interpolate(p, [0, 0.2], [0, 1], clamp) * (1 - suck) };
  };
  const disc = interpolate(f, [22, 30], [0, 26], clamp);
  return (
    <Center bg={LIME}>
      <Punch style={place(0, 120, 330, -9)} />
      <Club style={place(4, 420, 640, 7)} />
      <AppTile style={place(8, 80, 1000, -5)} />
      <Receipt style={place(12, 520, 1260, 10)} />
      <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: INK, left: 440, top: 860, transform: `scale(${disc})` }} />
    </Center>
  );
};

/* --- 4 to 8 s: one card for the whole street --- */
const OneCard: React.FC = () => {
  const f = useCurrentFrame();
  const mark = sp(f, 0, 14, 160);
  const rows = [['קפה פינה', '7/10'], ['מעדניית השוק', '3/8'], ['זעתר', '4/6'], ['מאפיית הגפן', '5/8']];
  return (
    <AbsoluteFill style={{ background: INK, alignItems: 'center' }}>
      <div style={{ marginTop: 300, transform: `scale(${interpolate(mark, [0, 1], [0.6, 1])})`, opacity: mark }}><Wordmark size={190} color={LIME} disc={LIME} /></div>
      <div style={{ marginTop: 70 }}><Slam at={30} size={110} color={LIME}>כרטיס אחד</Slam></div>
      <div style={{ marginTop: 6 }}><Slam at={45} size={72} color={PAPER} weight={700}>לכל העסקים בשכונה.</Slam></div>
      <div style={{ marginTop: 70, width: 820, display: 'grid', gap: 18 }}>
        {rows.map(([n, v], i) => {
          const s = sp(f, 60 + i * 8, 14, 200);
          return (
            <div key={n} style={{ background: PAPER, borderRadius: 22, padding: '22px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: impact, direction: 'rtl', fontSize: 40, fontWeight: 800, color: INK, opacity: s, transform: `translateY(${interpolate(s, [0, 1], [80, 0])}px)` }}>
              <span>{n}</span><span style={{ direction: 'ltr', fontWeight: 600, color: MUTED }}>{v}</span>
            </div>
          );
        })}
        <div style={{ fontFamily: impact, fontSize: 26, color: '#B9BCB0', textAlign: 'center', opacity: interpolate(f, [100, 110], [0, 1], clamp) }}>שמות לדוגמה</div>
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
    <div style={{ marginTop: 30 }}><Slam at={30} size={100} color={PAPER}>בלי התחייבות.</Slam></div>
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

export const PerkoReel: React.FC = () => (
  <AbsoluteFill>
    <Audio src={staticFile('music.wav')} volume={(f) => interpolate(f, [0, 575, 600], [0.9, 0.9, 0], clamp)} />
    <Sequence from={0} durationInFrames={60}><Hook /></Sequence>
    <Sequence from={60} durationInFrames={30}><Again /></Sequence>
    <Sequence from={90} durationInFrames={30}><Barrage /></Sequence>
    <Sequence from={120} durationInFrames={120}><OneCard /></Sequence>
    <Sequence from={240} durationInFrames={120}><Stamps /></Sequence>
    <Sequence from={360} durationInFrames={120}><Journey /></Sequence>
    <Sequence from={480} durationInFrames={60}><Offer /></Sequence>
    <Sequence from={540} durationInFrames={60}><End /></Sequence>
  </AbsoluteFill>
);
