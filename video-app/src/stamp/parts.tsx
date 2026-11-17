import React from 'react';
import { Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { impact, mono } from '../fonts';

// Perko brand (video-app/PROJECT_BRIEF.md): lime #D7FF35, ink #11130F, paper #F8F8F4.
export const LIME = '#D7FF35', INK = '#11130F', PAPER = '#F8F8F4', MUTED = '#5C6152';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Hebrew headline that enters word by word (arabic-text.md: base direction rtl, animate words, never letters). */
const WordsInner = ({ text, delay = 0, style }: { readonly text: string; readonly delay?: number; readonly style?: React.CSSProperties }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div dir="rtl" lang="he" style={{ fontFamily: impact, fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.03em', margin: 0, ...style }}>
      {text.split(' ').map((w, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            marginInlineEnd: '0.22em',
            opacity: interpolate(frame, [delay + i * 0.12 * fps, delay + i * 0.12 * fps + 4], [0, 1], clamp),
            translate: interpolate(frame, [delay + i * 0.12 * fps, delay + i * 0.12 * fps + 0.45 * fps], ['0px 70px', '0px 0px'], { ...clamp, easing: Easing.spring({ damping: 200 }) }),
          }}
        >
          {w}
        </span>
      ))}
    </div>
  );
};
export const Words = Interactive.create({
  Component: WordsInner,
  layout: 'none',
  schema: {
    text: { type: 'string', default: '', description: 'Text' },
    delay: { type: 'number', default: 0, description: 'Delay (frames)', hiddenFromList: false },
  },
});

/** Small tracked label */
export const Tag = ({ children, color = MUTED, style }: { readonly children: React.ReactNode; readonly color?: string; readonly style?: React.CSSProperties }) => (
  <div dir="rtl" lang="he" style={{ fontFamily: mono, fontSize: 30, letterSpacing: '0.1em', color, ...style }}>{children}</div>
);

/** The paper punch card. `stamps` filled holes; the tenth hole is the hero: pulsing while empty, landing when `last` > 0. */
const PunchCardInner = ({ stamps, business = 'קפה פינה', last = 0, pulse = false, width = 860, style }: {
  readonly stamps: number; readonly business?: string; readonly last?: number; readonly pulse?: boolean; readonly width?: number; readonly style?: React.CSSProperties;
}) => {
  const frame = useCurrentFrame();
  return (
    <div dir="rtl" lang="he" style={{ width, boxSizing: 'border-box', background: '#FCFBF6', borderRadius: width * 0.06, padding: `${width * 0.055}px ${width * 0.065}px`, boxShadow: '0 60px 100px -45px rgba(0,0,0,.55)', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: impact, fontWeight: 800, fontSize: width * 0.066, color: INK }}>{business}</span>
        <span style={{ fontFamily: mono, fontSize: width * 0.028, color: MUTED }}>לדוגמה · 10 = קפה חינם</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: width * 0.032, marginTop: width * 0.05 }}>
        {Array.from({ length: 10 }, (_, i) => {
          const tenth = i === 9;
          const filled = i < stamps || (tenth && last > 0);
          return (
            <div
              key={i}
              style={{
                aspectRatio: '1', borderRadius: '50%', position: 'relative',
                background: filled ? (tenth ? LIME : INK) : 'transparent',
                border: filled ? `${width * 0.008}px solid ${INK}` : `${width * 0.007}px dashed ${tenth ? INK : '#CFD1C5'}`,
                rotate: `${((i * 37) % 11) - 5}deg`,
                scale: tenth && last > 0 ? String(1 + (1 - last) * 1.2) : tenth && pulse ? String(1 + 0.08 * Math.sin(frame / 4)) : '1',
              }}
            >
              {filled && !tenth && <span style={{ position: 'absolute', inset: '28%', borderRadius: '50%', background: LIME }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export const PunchCard = Interactive.create({
  Component: PunchCardInner,
  layout: 'none',
  schema: {
    stamps: { type: 'number', default: 9, min: 0, max: 10, integer: true, description: 'Stamps', hiddenFromList: false },
    business: { type: 'string', default: 'קפה פינה', description: 'Business name' },
  },
});
