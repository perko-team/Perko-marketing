import React from 'react';
import { Composition } from 'remotion';
import { PerkoPromo } from './PerkoPromo';
import { PerkoReel } from './Reel';
import { FPS, H, REAL_DURATION, W } from './tokens';

export const RemotionRoot: React.FC = () => (
  <>
  <Composition id="PerkoReel" component={PerkoReel} durationInFrames={450} fps={30} width={1080} height={1920} />
  <Composition id="PerkoPromo" component={PerkoPromo} durationInFrames={REAL_DURATION} fps={FPS} width={W} height={H} />
  </>
);
