import React from 'react';
import { Composition } from 'remotion';
import { PerkoPromo } from './PerkoPromo';
import { PerkoReel, REEL_FRAMES } from './Reel';
import { PerkoReelMessage, MESSAGE_FRAMES } from './ReelMessage';
import { PerkoReelSplit, SPLIT_FRAMES } from './ReelSplit';
import { CoverBalloon, CoverMessage, CoverSplit } from './Covers';
import { FPS, H, REAL_DURATION, W } from './tokens';

export const RemotionRoot: React.FC = () => (
  <>
  <Composition id="CoverBalloon" component={CoverBalloon} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CoverMessage" component={CoverMessage} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CoverSplit" component={CoverSplit} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="PerkoReelMessage" component={PerkoReelMessage} durationInFrames={MESSAGE_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="PerkoReelSplit" component={PerkoReelSplit} durationInFrames={SPLIT_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="PerkoReel" component={PerkoReel} durationInFrames={REEL_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="PerkoPromo" component={PerkoPromo} durationInFrames={REAL_DURATION} fps={FPS} width={W} height={H} />
  </>
);
