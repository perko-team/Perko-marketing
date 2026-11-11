// The edit, on the score's map (MUSIC-MAP.md): the world runs through the intro and the full section, the punch on
// beat 2 of bar 0, the dive on the riser, the open spots light up from the drop (bar 2), the card forms on bar 4,
// and the end card starts as the groove stops (bar 6) and holds to the end.
import type { TimelineEntry } from './engine/engine';
import type { Audio } from './engine/audio';
import { project } from './project';
import Flat from './scenes/flat';
import End from './scenes/end';

export function makeTimeline(au: Audio): TimelineEntry[] {
  const bar = (n: number) => au.timeOfBar(n);
  return [
    { id: 'flat', scene: Flat, start: 0, end: bar(6) },
    { id: 'end', scene: End, start: bar(6), end: project.duration },
  ];
}
