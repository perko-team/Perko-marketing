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

/* One message across the three reel covers (3240x1920, cut into three 1080x1920 tiles).
   The profile grid shows each tile's centre 1080x1440 (y 240-1680), so every word sits inside one tile's band and
   nothing important crosses a tile edge. Read right to left: right tile, middle, left. */
const TILE = 1080;
const col = (i: number): React.CSSProperties => ({ position: 'absolute', left: i * TILE, width: TILE, display: 'flex', justifyContent: 'center' });
export const CoverTriptych: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(90% 120% at 80% 20%, #E2FF66 0%, ${LIME} 60%)` }}>
    <div style={{ position: 'absolute', left: 110, right: 110, top: 330, height: 1000, background: C.inkRaised, borderRadius: 90, boxShadow: '0 60px 120px -40px rgba(17,19,15,.55)' }} />
    {/* header: the app dot and sender on the right tile, the time on the left tile */}
    <div style={{ position: 'absolute', top: 420, right: 230, display: 'flex', alignItems: 'center', gap: 34, direction: 'rtl', ...monoStyle(48, C.onInk) }}>
      <span style={{ width: 120, height: 120, borderRadius: 34, background: LIME, display: 'grid', placeItems: 'center' }}><span style={{ width: 44, height: 44, borderRadius: 44, background: INK }} /></span>
      <span>לקוח קבוע</span>
    </div>
    <div style={{ position: 'absolute', top: 455, left: 230, ...monoStyle(48, C.onInk) }}>עכשיו</div>
    <div style={{ ...col(2), top: 760 }}><span style={impactStyle(225, PAPER)}>הכרטיס</span></div>
    <div style={{ ...col(1), top: 760 }}><span style={impactStyle(225, PAPER)}>נשאר</span></div>
    <div style={{ ...col(0), top: 760 }}><span style={impactStyle(225, LIME)}>בבית.</span></div>
    {/* under the card: the brand on the right, the answer on the left */}
    <div style={{ ...col(2), top: 1430 }}><Wordmark size={110} color={INK} disc={INK} /></div>
    <div style={{ ...col(1), top: 1450 }}><span style={monoStyle(40, MUTED)}>גישה מוקדמת · בחינם</span></div>
    <div style={{ position: 'absolute', left: 150, top: 1400, width: 780, background: PAPER, borderRadius: '50px 50px 50px 14px', padding: '34px 44px', direction: 'rtl', ...impactStyle(64, INK), whiteSpace: 'normal', lineHeight: 1.2 }}>
      אין בעיה. הכרטיס כבר בטלפון.
    </div>
  </AbsoluteFill>
);
