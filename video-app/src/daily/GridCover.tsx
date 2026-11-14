import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C } from '../tokens';
import { impactStyle, accentStyle } from '../components/Kinetic';
import { Wordmark } from '../components/Wordmark';
import { monoStyle, LIME, INK, PAPER } from '../Reel';
import type { z } from 'zod';
import type { spec } from './DailyReel';
type Spec = z.infer<typeof spec>;

// Profile-grid cover for a daily reel (1080x1920). The grid shows the centre 1080x1440 (y 240-1680), so every element
// sits inside y 330-1590. Two tones, lime and ink: the server picks the one opposite to the last published reel,
// so a 3-column grid always reads as a checkerboard, whatever order the reels end up being published in.
export type Tone = 'lime' | 'ink';

const hookSize = (s: string) => (s.length <= 7 ? 250 : s.length <= 11 ? 200 : s.length <= 15 ? 165 : 140);

export const GridCover: React.FC<Spec & { tone: Tone }> = ({ tone, topic, hook, hookAccent }) => {
  const dark = tone === 'ink';
  const bg = dark ? INK : LIME, fg = dark ? PAPER : INK, accent = dark ? LIME : INK, quiet = dark ? '#8E9486' : 'rgba(17,19,15,.6)';
  return (
    <AbsoluteFill style={{ background: bg }}>
      {/* a soft glow keeps the flat colour from looking empty at grid size */}
      <AbsoluteFill style={{ background: `radial-gradient(70% 45% at 75% 30%, ${dark ? 'rgba(215,255,53,.10)' : 'rgba(255,255,255,.35)'} 0%, transparent 70%)` }} />
      <div style={{ position: 'absolute', top: 360, right: 90, left: 90, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={monoStyle(34, quiet)}>{topic ?? ''}</span>
        <span style={{ width: 26, height: 26, borderRadius: 26, background: accent }} />
      </div>
      <div style={{ position: 'absolute', top: 470, bottom: 470, left: 90, right: 90, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 44 }}>
        <div style={{ ...impactStyle(hookSize(hook), fg), whiteSpace: 'normal', lineHeight: 0.98, textAlign: 'right' }}>{hook}</div>
        {hookAccent && <div style={{ ...accentStyle(84, accent), whiteSpace: 'normal', lineHeight: 1.1, textAlign: 'right', opacity: dark ? 1 : 0.85 }}>{hookAccent}</div>}
      </div>
      <div style={{ position: 'absolute', top: 1480, right: 90 }}><Wordmark size={84} color={fg} disc={dark ? LIME : INK} /></div>
      <div style={{ position: 'absolute', top: 1500, left: 90, ...monoStyle(30, quiet) }}>getperko.com</div>
      <div style={{ position: 'absolute', top: 1440, left: 90, right: 90, height: 3, background: dark ? C.inkRaised : 'rgba(17,19,15,.15)' }} />
    </AbsoluteFill>
  );
};

export const GridCoverLime: React.FC<Spec> = (p) => <GridCover {...p} tone="lime" />;
export const GridCoverInk: React.FC<Spec> = (p) => <GridCover {...p} tone="ink" />;
