import React from 'react';
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { impact } from './fonts';

// A vertical reel for businesses (1080x1920, 15 s). Safe zones: nothing important in the top or bottom 250 px.
const LIME = '#D7FF35', INK = '#11130F', PAPER = '#F8F8F4', MUTED = '#303626';
const F = { fontFamily: impact, direction: 'rtl' as const };

const rise = (frame: number, fps: number, delay = 0) => {
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return { opacity: interpolate(s, [0, 1], [0, 1]), transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px)` };
};

const Wrap: React.FC<{ bg: string; children: React.ReactNode }> = ({ bg, children }) => (
  <AbsoluteFill style={{ background: bg, padding: '250px 90px', ...F, justifyContent: 'center' }}>{children}</AbsoluteFill>
);

const Brand: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ position: 'absolute', top: 150, insetInlineStart: 90, fontWeight: 800, fontSize: 56, letterSpacing: '-0.055em', color }}>
    perk<span style={{ display: 'inline-block', width: 24, height: 24, borderRadius: '50%', background: color, marginInlineStart: 4 }} />
  </div>
);

const SceneOne: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig();
  return (
    <Wrap bg={LIME}>
      <Brand color={INK} />
      <div style={{ fontWeight: 900, fontSize: 150, lineHeight: 1.02, color: INK, letterSpacing: '-0.035em' }}>
        <div style={rise(f, fps, 0)}>כל ההטבות.</div>
        <div style={rise(f, fps, 14)}>מקום אחד.</div>
      </div>
      <div style={{ marginTop: 60, fontSize: 48, fontWeight: 500, color: MUTED, ...rise(f, fps, 40) }}>לעסקים בשכונה</div>
    </Wrap>
  );
};

const SceneTwo: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig();
  const on = Math.min(9, Math.floor((f - 6) / 12));
  return (
    <Wrap bg={INK}>
      <Brand color={LIME} />
      <div style={{ background: PAPER, color: INK, borderRadius: 48, padding: 64, ...rise(f, fps, 0) }}>
        <div style={{ fontSize: 44, fontWeight: 700 }}>קפה פינה · לדוגמה</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 22, marginTop: 44 }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{ aspectRatio: '1', borderRadius: '50%', border: `4px solid ${INK}`, background: i <= on ? INK : 'transparent' }} />
          ))}
        </div>
        <div style={{ fontSize: 44, fontWeight: 600, marginTop: 44 }}>כל כוס קפה עשירית חינם</div>
      </div>
      <div style={{ marginTop: 70, fontSize: 84, fontWeight: 900, color: LIME, lineHeight: 1.1, ...rise(f, fps, 30) }}>
        הלקוחות חוזרים.
      </div>
      <div style={{ fontSize: 84, fontWeight: 900, color: PAPER, lineHeight: 1.1, ...rise(f, fps, 50) }}>העסק נשאר בתודעה.</div>
    </Wrap>
  );
};

const SceneThree: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig();
  const steps = ['נרשמים בחינם', 'שיחה קצרה איתנו', 'מגדירים את ההטבה', 'קוד לדלפק', 'הכרטיס פעיל'];
  return (
    <Wrap bg={PAPER}>
      <Brand color={INK} />
      <div style={{ fontWeight: 900, fontSize: 120, lineHeight: 1.05, color: INK, letterSpacing: '-0.035em', ...rise(f, fps, 0) }}>
        מהרישום<br />ועד הכרטיס.
      </div>
      <div style={{ marginTop: 80, display: 'grid', gap: 36 }}>
        {steps.map((t, i) => {
          const s = spring({ frame: f - 30 - i * 22, fps, config: { damping: 200 } });
          return (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 32, opacity: interpolate(s, [0, 1], [0.15, 1]) }}>
              <span style={{ width: 96, height: 96, borderRadius: '50%', border: `5px solid ${INK}`, display: 'grid', placeItems: 'center', fontSize: 44, fontWeight: 800, flex: 'none', background: s > 0.5 ? INK : 'transparent', color: s > 0.5 ? LIME : INK }}>{i + 1}</span>
              <span style={{ fontSize: 60, fontWeight: 700, color: INK }}>{t}</span>
            </div>
          );
        })}
      </div>
    </Wrap>
  );
};

const SceneFour: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig();
  const disc = spring({ frame: f - 4, fps, config: { damping: 200 } });
  return (
    <Wrap bg={LIME}>
      <div style={{ position: 'absolute', top: 1240, left: '50%', width: 300, height: 300, borderRadius: '50%', background: INK, transform: `translate(-50%, 0) scale(${interpolate(disc, [0, 1], [0.2, 1])})` }} />
      <div style={{ position: 'relative', fontWeight: 900, fontSize: 124, lineHeight: 1.05, color: INK, textAlign: 'center', letterSpacing: '-0.035em', ...rise(f, fps, 16) }}>
        הצטרפו בחינם<br />לגישה המוקדמת.
      </div>
      <div style={{ marginTop: 56, fontSize: 46, fontWeight: 500, color: MUTED, textAlign: 'center', ...rise(f, fps, 40) }}>בלי התחייבות לתשלום</div>
    </Wrap>
  );
};

export const PerkoReel: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={90}><SceneOne /></Sequence>
    <Sequence from={90} durationInFrames={120}><SceneTwo /></Sequence>
    <Sequence from={210} durationInFrames={150}><SceneThree /></Sequence>
    <Sequence from={360} durationInFrames={90}><SceneFour /></Sequence>
  </AbsoluteFill>
);
