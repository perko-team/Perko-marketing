import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { iris } from '@remotion/transitions/iris';
import { pushCut } from '@remotion/transitions/push-cut';
import { Easing, Img, Interactive, Track, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { impact } from '../fonts';
import { INK, LIME, MUTED, PAPER, PunchCard, Tag, Words } from './parts';

// Two more story reels on the StampReel pattern (Remotion best practices: scenes in a TransitionSeries, built-in
// transitions, word-by-word Hebrew, editable texts, music and sound effects on tracks). Hooks written with the
// viral-video-hooks-retention method (content/HOOKS.md). Only features the app has today; app screens are sample data.
const W = 1080, H = 1920;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const spring = { ...clamp, easing: Easing.spring({ damping: 200 }) };
const str = (d = '') => ({ type: 'string' as const, default: d, description: 'Text' });

/* ---------- shared scenes ---------- */
/** Big text scene: title + line, an optional object under them. */
const SayInner = ({ title, line, dark = false, children }: { readonly title: string; readonly line: string; readonly dark?: boolean; readonly children?: React.ReactNode }) => (
  <>
    <div style={{ position: 'absolute', top: 430, right: 90, left: 90, display: 'flex', flexDirection: 'column', gap: 26 }}>
      <Words name="Title" text={title} style={{ fontSize: 140, color: dark ? PAPER : INK }} />
      <Words name="Line" text={line} delay={8} style={{ fontSize: 76, fontWeight: 700, color: dark ? LIME : MUTED }} />
    </div>
    {children}
  </>
);
const Say = Interactive.create({ Component: SayInner, layout: 'absolute-fill', schema: { ...Interactive.backgroundSchema, title: str(), line: str() } });

/** A real app screen in a phone, rising from below, with an optional tap. */
const PW = 430;
const PhoneInner = ({ title, shot, tapX = -1, tapY = -1 }: { readonly title: string; readonly shot: string; readonly tapX?: number; readonly tapY?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      <Words name="Phone title" text={title} style={{ position: 'absolute', top: 340, right: 90, left: 90, fontSize: 88, color: PAPER }} />
      <Tag color="#9EA394" style={{ position: 'absolute', top: 560, right: 90 }}>האפליקציה האמיתית · נתוני דוגמה</Tag>
      <div style={{ position: 'absolute', left: W / 2 - PW / 2, top: 620, width: PW, height: PW * (892 / 412), borderRadius: 72, padding: 14, boxSizing: 'border-box', background: '#2A2E24',
        translate: interpolate(frame, [0, 0.55 * fps], ['0px 1100px', '0px 0px'], spring) }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 58, overflow: 'hidden', position: 'relative' }}>
          <Img src={staticFile(`shots/${shot}.png`)} style={{ width: '100%', display: 'block' }} />
          {tapX >= 0 && <div style={{ position: 'absolute', left: tapX - 55, top: tapY - 55, width: 110, height: 110, borderRadius: '50%', border: `7px solid ${LIME}`, background: 'rgba(215,255,53,.28)',
            opacity: interpolate(frame, [1.1 * fps, 1.15 * fps, 1.7 * fps], [0, 1, 0], clamp), scale: interpolate(frame, [1.1 * fps, 1.7 * fps], [0.4, 1.4], clamp) }} />}
        </div>
      </div>
    </>
  );
};
const Phone = Interactive.create({ Component: PhoneInner, layout: 'absolute-fill', schema: { ...Interactive.backgroundSchema, title: str(), shot: str('wallet') } });

/** End card: the wordmark, a line and the call to action. */
const EndInner = ({ line, cta }: { readonly line: string; readonly cta: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      <div dir="ltr" style={{ position: 'absolute', top: 700, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 8, fontFamily: impact, fontWeight: 800, fontSize: 230, letterSpacing: '-0.055em', color: PAPER, lineHeight: 1 }}>
        <span style={{ clipPath: `inset(-20% ${interpolate(frame, [0.15 * fps, 0.8 * fps], [100, 0], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) })}% -20% -5%)` }}>perk</span>
        <span style={{ width: '0.5em', height: '0.5em', borderRadius: '50%', background: LIME, boxShadow: '0 0 70px rgba(215,255,53,.55)', scale: interpolate(frame, [0, 0.3 * fps], [0, 1], spring) }} />
      </div>
      <Words name="End line" text={line} delay={0.7 * fps} style={{ position: 'absolute', top: 1010, right: 90, left: 90, fontSize: 70, fontWeight: 700, color: PAPER, textAlign: 'center' }} />
      <Words name="End CTA" text={cta} delay={1.1 * fps} style={{ position: 'absolute', top: 1160, right: 90, left: 90, fontSize: 46, fontWeight: 500, color: LIME, textAlign: 'center' }} />
    </>
  );
};
const End = Interactive.create({ Component: EndInner, layout: 'absolute-fill', schema: { ...Interactive.backgroundSchema, line: str(), cta: str() } });

/** The street: shop fronts in a row, one of them lights up. */
const SHOPS = ['מאפייה', 'ספרים', 'מספרה', 'קפה', 'פרחים'];
const Street = ({ lit }: { readonly lit: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div dir="rtl" style={{ position: 'absolute', left: 60, right: 60, top: 1080, display: 'flex', gap: 18, alignItems: 'flex-end' }}>
      {SHOPS.map((s, k) => (
        <div key={s} style={{ flex: 1, height: 300 + (k % 2) * 60, borderRadius: '28px 28px 0 0', background: k === lit ? LIME : '#2A2E24', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 26,
          translate: interpolate(frame, [k * 2, k * 2 + 0.45 * fps], ['0px 500px', '0px 0px'], spring) }}>
          <span style={{ fontFamily: impact, fontWeight: 800, fontSize: 36, color: k === lit ? INK : '#9EA394' }}>{s}</span>
        </div>
      ))}
    </div>
  );
};

/** The queue behind you: people stepping in one by one. */
const Queue = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', left: 90, right: 90, top: 1060, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      {[0, 1, 2, 3, 4].map((k) => (
        <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          translate: interpolate(frame, [k * 4, k * 4 + 0.45 * fps], ['-160px 0px', '0px 0px'], spring), opacity: interpolate(frame, [k * 4, k * 4 + 5], [0, 1], clamp) }}>
          <div style={{ width: 110, height: 110, borderRadius: '50%', background: k === 4 ? LIME : '#3A3F33' }} />
          <div style={{ width: 150, height: 260 - (k % 2) * 30, borderRadius: '75px 75px 20px 20px', background: k === 4 ? LIME : '#3A3F33' }} />
        </div>
      ))}
    </div>
  );
};

/** Cards spilling out of a wallet. */
const Spill = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <PunchCard key={k} name={`Spilled card ${k + 1}`} stamps={(k * 3) % 8} business={['המאפייה', 'המספרה', 'הקפה', 'הפרחים', 'הפיצה', 'המכבסה'][k]} width={520} style={{
          position: 'absolute', left: W / 2 - 260, top: 1000,
          translate: interpolate(frame, [k * 3, k * 3 + 0.7 * fps], ['0px -300px', `${(k - 2.5) * 120}px ${180 + (k % 3) * 120}px`], spring),
          rotate: interpolate(frame, [k * 3, k * 3 + 0.7 * fps], ['0deg', `${(k - 2.5) * 16}deg`], spring),
        }} />
      ))}
    </>
  );
};

const Music = ({ file, from, vol }: { readonly file: string; readonly from: number; readonly vol: number }) => {
  const { fps, durationInFrames } = useVideoConfig();
  return <Audio name="Music" src={staticFile(`music/${file}`)} trimBefore={Math.round(from * fps)}
    volume={(f) => interpolate(f, [0, durationInFrames - 0.6 * fps, durationInFrames], [vol, vol, 0], clamp)} />;
};

/* ---------- reel 2: for owners. Hook trigger: loss aversion + open loop ---------- */
export const NEIGHBOR_FRAMES = 2.4 * 30 + 2.2 * 30 + 2.4 * 30 + 2.2 * 30 + 3 * 30 - 4 * 12;
export const NeighborReel = () => {
  const { fps } = useVideoConfig();
  const t = 12;
  return (
    <>
      <TransitionSeries name="Scenes">
        <TransitionSeries.Sequence name="Hook" durationInFrames={2.4 * fps}>
          <Say title="הלקוח של המאפייה ממול" line="עובר לידך כל בוקר." dark style={{ backgroundColor: INK }}><Street lit={0} /></Say>
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: 'from-right' })} timing={springTiming({ config: { damping: 200 }, durationInFrames: t })} />
        <TransitionSeries.Sequence name="Problem" durationInFrames={2.2 * fps}>
          <Say title="והוא לא יודע שאתם שם." line="הכרטיסייה שלו מהמאפייה בלבד." style={{ backgroundColor: LIME }}>
            <PunchCard name="Bakery card" stamps={6} business="המאפייה" width={700} style={{ position: 'absolute', left: 190, top: 1080, rotate: '-5deg' }} />
          </Say>
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-left' })} timing={springTiming({ config: { damping: 200 }, durationInFrames: t })} />
        <TransitionSeries.Sequence name="Discover" durationInFrames={2.4 * fps}>
          <Phone title="בפרקו הוא רואה גם אתכם." shot="discover" tapX={210} tapY={360} style={{ backgroundColor: INK }} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={pushCut({ flashColor: LIME })} timing={linearTiming({ durationInFrames: t })} />
        <TransitionSeries.Sequence name="Street lit" durationInFrames={2.2 * fps}>
          <Say title="ארנק אחד. כל השכונה." line="הלקוח של השכן מגיע גם אליכם." style={{ backgroundColor: PAPER }}><Street lit={3} /></Say>
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={iris({ width: W, height: H })} timing={linearTiming({ durationInFrames: t, easing: Easing.bezier(0.7, 0, 0.84, 0) })} />
        <TransitionSeries.Sequence name="End" durationInFrames={3 * fps}>
          <End line="כרטיסייה אחת לכל השכונה." cta="לבעלי עסקים: גישה מוקדמת בחינם · הקישור בביו" style={{ backgroundColor: INK }} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Track name="Music">
        {/* "Tech House vibes" by Alejandro Magaña, Mixkit #130 (MUSIC.md) */}
        <Music file="mixkit-130.mp3" from={0.1} vol={0.32} />
      </Track>
      <Track name="Sounds">
        <Audio name="Shops land" src={staticFile('daily/kit/pop.ogg')} from={0.2 * fps} durationInFrames={fps} volume={0.5} />
        <Audio name="Whoosh 1" src={staticFile('daily/kit/whoosh.ogg')} from={2.4 * fps - t} durationInFrames={fps} volume={0.45} />
        <Audio name="Whoosh 2" src={staticFile('daily/kit/whoosh.ogg')} from={4.6 * fps - 2 * t} durationInFrames={fps} volume={0.45} />
        <Audio name="Tap" src={staticFile('daily/kit/ding.ogg')} from={4.6 * fps - 2 * t + 1.1 * fps} durationInFrames={fps} volume={0.35} />
        <Audio name="Flash" src={staticFile('daily/kit/impact.ogg')} from={7 * fps - 3 * t + t / 2} durationInFrames={fps} volume={0.2} />
        <Audio name="Logo" src={staticFile('daily/kit/pop.ogg')} from={9.2 * fps - 4 * t + 0.2 * fps} durationInFrames={fps} volume={0.6} />
      </Track>
    </>
  );
};

/* ---------- reel 3: for customers. Hook trigger: pattern interrupt, mid-scene ---------- */
export const FUMBLE_FRAMES = 2.4 * 30 + 2.2 * 30 + 2.4 * 30 + 2 * 30 + 3 * 30 - 4 * 12;
export const FumbleReel = () => {
  const { fps } = useVideoConfig();
  const t = 12;
  return (
    <>
      <TransitionSeries name="Scenes">
        <TransitionSeries.Sequence name="Hook" durationInFrames={2.4 * fps}>
          <Say title="״יש לך כרטיסייה?״" line="״רגע... היא פה איפשהו...״" style={{ backgroundColor: LIME }}><Spill /></Say>
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: 'from-bottom' })} timing={springTiming({ config: { damping: 200 }, durationInFrames: t })} />
        <TransitionSeries.Sequence name="Queue" durationInFrames={2.2 * fps}>
          <Say title="והתור מאחוריך מחכה." line="שוב." dark style={{ backgroundColor: INK }}><Queue /></Say>
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-left' })} timing={springTiming({ config: { damping: 200 }, durationInFrames: t })} />
        <TransitionSeries.Sequence name="Scan" durationInFrames={2.4 * fps}>
          <Phone title="בפעם הבאה: סורקים." shot="scan-result" style={{ backgroundColor: INK }} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={pushCut({ flashColor: LIME })} timing={linearTiming({ durationInFrames: t })} />
        <TransitionSeries.Sequence name="Done" durationInFrames={2 * fps}>
          <Say title="״יש. בטלפון.״" line="כל הכרטיסיות שלך, במקום אחד." style={{ backgroundColor: LIME }} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={iris({ width: W, height: H })} timing={linearTiming({ durationInFrames: t, easing: Easing.bezier(0.7, 0, 0.84, 0) })} />
        <TransitionSeries.Sequence name="End" durationInFrames={3 * fps}>
          <End line="כרטיסייה אחת לכל השכונה." cta="שלחו לבעל העסק שאתם הכי אוהבים" style={{ backgroundColor: INK }} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Track name="Music">
        {/* "It's Love" by Michael Ramir C., Mixkit #834 (MUSIC.md) */}
        <Music file="mixkit-834.mp3" from={34.4} vol={0.38} />
      </Track>
      <Track name="Sounds">
        <Audio name="Cards spill" src={staticFile('daily/kit/click.ogg')} from={0.1 * fps} durationInFrames={fps} volume={0.6} />
        <Audio name="Cards spill 2" src={staticFile('daily/kit/click.ogg')} from={0.3 * fps} durationInFrames={fps} volume={0.5} />
        <Audio name="Whoosh 1" src={staticFile('daily/kit/whoosh.ogg')} from={2.4 * fps - t} durationInFrames={fps} volume={0.45} />
        <Audio name="Whoosh 2" src={staticFile('daily/kit/whoosh.ogg')} from={4.6 * fps - 2 * t} durationInFrames={fps} volume={0.45} />
        <Audio name="Flash" src={staticFile('daily/kit/impact.ogg')} from={7 * fps - 3 * t + t / 2} durationInFrames={fps} volume={0.2} />
        <Audio name="Done" src={staticFile('daily/kit/ding.ogg')} from={7 * fps - 3 * t + 0.4 * fps} durationInFrames={fps} volume={0.35} />
        <Audio name="Logo" src={staticFile('daily/kit/pop.ogg')} from={9 * fps - 4 * t + 0.2 * fps} durationInFrames={fps} volume={0.6} />
      </Track>
    </>
  );
};
