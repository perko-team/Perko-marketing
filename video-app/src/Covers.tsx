import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C } from './tokens';
import { impactStyle } from './components/Kinetic';
import { Wordmark } from './components/Wordmark';
import { Field, monoStyle, LIME, INK, PAPER, MUTED } from './Reel';
import { Notice } from './ReelMessage';

// Reel covers (1080x1920) built like a phone notification. Everything that matters sits inside the centre
// 1080x1350 band (y 285-1635), which is what the profile grid shows.
const Mark: React.FC<{ color: string; disc: string }> = ({ color, disc }) => (
  <div style={{ position: 'absolute', top: 1470, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}><Wordmark size={92} color={color} disc={disc} /></div>
);

export const CoverBalloon: React.FC = () => (
  <Field k="ink">
    <div style={{ position: 'absolute', top: 400, right: 80, ...monoStyle(28, C.onInk) }}>הודעה חדשה</div>
    <div style={{ position: 'absolute', top: 470, left: 80 }}>
      <Notice from="פרקו" light>הכרטיס של הלקוח הכי נאמן שלך עומד להיעלם.</Notice>
    </div>
    <div style={{ position: 'absolute', top: 900, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}><span style={impactStyle(132, LIME)}>לפני שהוא נעלם.</span></div>
    <Mark color={PAPER} disc={LIME} />
  </Field>
);

export const CoverMessage: React.FC = () => (
  <Field k="lime">
    <div style={{ position: 'absolute', top: 400, right: 80, ...monoStyle(28, MUTED) }}>הודעה חדשה</div>
    <div style={{ position: 'absolute', top: 470, left: 80 }}>
      <Notice from="לקוח קבוע">היי, הכרטיס ניקוב שלי נשאר בבית. אפשר בכל זאת חותמת?</Notice>
    </div>
    <div style={{ position: 'absolute', top: 960, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}><span style={impactStyle(150, INK)}>שמעת את זה?</span></div>
    <Mark color={INK} disc={INK} />
  </Field>
);

export const CoverSplit: React.FC = () => (
  <AbsoluteFill>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 960, background: C.tint }} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 960, bottom: 0, background: LIME }} />
    <div style={{ position: 'absolute', top: 400, right: 80, ...monoStyle(28, MUTED) }}>היום</div>
    <div style={{ position: 'absolute', top: 1260, right: 80, ...monoStyle(28, MUTED) }}>עם פרקו</div>
    <div style={{ position: 'absolute', top: 760, left: 80 }}>
      <Notice from="פרקו">כרטיס לכל עסק, או כרטיס אחד לכל השכונה?</Notice>
    </div>
    <div style={{ position: 'absolute', top: 470, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}><span style={{ ...impactStyle(150, INK), textDecoration: 'line-through', textDecorationThickness: 10 }}>עוד כרטיס.</span></div>
    <Mark color={INK} disc={INK} />
  </AbsoluteFill>
);
