import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { iris } from '@remotion/transitions/iris';
import { pushCut } from '@remotion/transitions/push-cut';
import { clockWipe } from '@remotion/transitions/clock-wipe';
import { Easing, Img, Interactive, Track, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { impact } from '../fonts';
import { INK, LIME, MUTED, PAPER, PunchCard, Tag, Words } from './parts';

// "החותמת האחרונה" (story reel, 9:16, 30 fps). Built to Remotion's own best practices: one component per scene,
// scenes kept adjacent in a TransitionSeries, built-in transitions, Hebrew animated by word with dir="rtl",
// texts and timing editable in Studio, music and sound effects on their own tracks (@remotion/media).
const W = 1080, H = 1920;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/* ---------- scenes ---------- */
const HookInner = ({ title, line }: { readonly title: string; readonly line: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      <Tag color="#9EA394" style={{ position: 'absolute', top: 360, right: 90 }}>17:42 · בקופה</Tag>
      <div style={{ position: 'absolute', top: 420, right: 90, left: 90, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Words name="Hook title" text={title} style={{ fontSize: 150, color: PAPER }} />
        <Words name="Hook line" text={line} delay={6} style={{ fontSize: 96, color: LIME }} />
      </div>
      <PunchCard
        name="Card"
        stamps={9}
        pulse
        style={{
          position: 'absolute', left: 110, top: 920,
          translate: interpolate(frame, [0, 0.6 * fps], ['0px 700px', '0px 0px'], { ...clamp, easing: Easing.spring({ damping: 200 }) }),
          rotate: interpolate(frame, [0, 0.6 * fps], ['-14deg', '-4deg'], { ...clamp, easing: Easing.spring({ damping: 200 }) }),
        }}
      />
    </>
  );
};
const Hook = Interactive.create({ Component: HookInner, layout: 'absolute-fill', schema: { ...Interactive.backgroundSchema, title: { type: 'string', default: '', description: 'Title' }, line: { type: 'string', default: '', description: 'Line' } } });

const HomeInner = ({ title, line }: { readonly title: string; readonly line: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {/* the card on the kitchen table, at home: small, far away, tilted */}
      <PunchCard name="Card at home" stamps={9} width={420} style={{ position: 'absolute', left: 330, top: 1180, rotate: '11deg', opacity: 0.9,
        scale: interpolate(frame, [0, 1.5 * fps], [1.15, 0.95], { ...clamp, easing: Easing.bezier(0.45, 0, 0.55, 1) }) }} />
      <Words name="Home title" text={title} style={{ position: 'absolute', top: 470, right: 90, left: 90, fontSize: 150, color: INK }} />
      <Words name="Home line" text={line} delay={14} style={{ position: 'absolute', top: 840, right: 90, left: 90, fontSize: 72, fontWeight: 700, color: MUTED }} />
    </>
  );
};
const Home = Interactive.create({ Component: HomeInner, layout: 'absolute-fill', schema: { ...Interactive.backgroundSchema, title: { type: 'string', default: '', description: 'Title' }, line: { type: 'string', default: '', description: 'Line' } } });

const NAMES = ['המאפייה', 'הספרייה', 'המספרה', 'הפרחים', 'הפיצה', 'המכבסה', 'הירקן', 'הגלידה', 'הסושי', 'הקפה'];
const WalletInner = ({ title }: { readonly title: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const count = Math.round(interpolate(frame, [0.1 * fps, 1.1 * fps], [1, 10], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
  return (
    <>
      {NAMES.map((nm, k) => (
        // one template for the stack, so a loop (timeline-structure.md)
        <PunchCard key={nm} name={`Wallet card ${k + 1}`} business={nm} stamps={2 + ((k * 3) % 7)} width={560} style={{
          position: 'absolute', left: W / 2 - 280, top: 1150,
          translate: interpolate(frame, [k * 2, k * 2 + 0.5 * fps], ['0px 900px', `${(k - 4.5) * 46}px ${-k * 26}px`], { ...clamp, easing: Easing.spring({ damping: 200 }) }),
          rotate: `${(k - 4.5) * 4}deg`,
        }} />
      ))}
      <div dir="ltr" style={{ position: 'absolute', top: 330, left: 0, right: 0, textAlign: 'center', fontFamily: impact, fontWeight: 900, fontSize: 300, color: INK, lineHeight: 1 }}>{count}</div>
      <Words name="Wallet title" text={title} delay={10} style={{ position: 'absolute', top: 650, right: 90, left: 90, fontSize: 76, color: INK, textAlign: 'center' }} />
    </>
  );
};
const Wallet = Interactive.create({ Component: WalletInner, layout: 'absolute-fill', schema: { ...Interactive.backgroundSchema, title: { type: 'string', default: '', description: 'Title' } } });

const PW = 470;
const AppInner = ({ title }: { readonly title: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      <Words name="App title" text={title} style={{ position: 'absolute', top: 380, right: 90, left: 90, fontSize: 112, color: PAPER }} />
      <Tag color="#9EA394" style={{ position: 'absolute', top: 520, right: 90 }}>האפליקציה האמיתית · נתוני דוגמה</Tag>
      <div style={{ position: 'absolute', left: W / 2 - PW / 2, top: 600, width: PW, height: PW * (892 / 412), borderRadius: 72, padding: 14, boxSizing: 'border-box', background: '#2A2E24',
        translate: interpolate(frame, [0, 0.55 * fps], ['0px 1100px', '0px 0px'], { ...clamp, easing: Easing.spring({ damping: 200 }) }) }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 58, overflow: 'hidden', position: 'relative' }}>
          <Img src={staticFile('shots/wallet.png')} style={{ width: '100%', display: 'block' }} />
          <div style={{ position: 'absolute', left: 120, top: 250, width: 110, height: 110, borderRadius: '50%', border: `7px solid ${LIME}`, background: 'rgba(215,255,53,.28)',
            opacity: interpolate(frame, [1.2 * fps, 1.25 * fps, 1.8 * fps], [0, 1, 0], clamp),
            scale: interpolate(frame, [1.2 * fps, 1.8 * fps], [0.4, 1.4], clamp) }} />
        </div>
      </div>
    </>
  );
};
const App = Interactive.create({ Component: AppInner, layout: 'absolute-fill', schema: { ...Interactive.backgroundSchema, title: { type: 'string', default: '', description: 'Title' } } });

const FullInner = ({ title, line }: { readonly title: string; readonly line: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      <PunchCard name="Full card" stamps={9} last={interpolate(frame, [0.4 * fps, 0.65 * fps], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) })}
        style={{ position: 'absolute', left: 110, top: 480, rotate: '3deg' }} />
      <Words name="Full title" text={title} delay={0.45 * fps} style={{ position: 'absolute', top: 1010, right: 90, left: 90, fontSize: 230, color: INK }} />
      <Words name="Full line" text={line} delay={0.8 * fps} style={{ position: 'absolute', top: 1260, right: 90, left: 90, fontSize: 76, fontWeight: 700, color: INK }} />
    </>
  );
};
const Full = Interactive.create({ Component: FullInner, layout: 'absolute-fill', schema: { ...Interactive.backgroundSchema, title: { type: 'string', default: '', description: 'Title' }, line: { type: 'string', default: '', description: 'Line' } } });

const EndInner = ({ line, cta }: { readonly line: string; readonly cta: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      <div dir="ltr" style={{ position: 'absolute', top: 700, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 8, fontFamily: impact, fontWeight: 800, fontSize: 230, letterSpacing: '-0.055em', color: PAPER, lineHeight: 1 }}>
        <span style={{ clipPath: `inset(-20% ${interpolate(frame, [0.15 * fps, 0.8 * fps], [100, 0], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) })}% -20% -5%)` }}>perk</span>
        <span style={{ width: '0.5em', height: '0.5em', borderRadius: '50%', background: LIME, boxShadow: '0 0 70px rgba(215,255,53,.55)',
          scale: interpolate(frame, [0, 0.3 * fps], [0, 1], { ...clamp, easing: Easing.spring({ damping: 200 }) }) }} />
      </div>
      <Words name="End line" text={line} delay={0.7 * fps} style={{ position: 'absolute', top: 1010, right: 90, left: 90, fontSize: 70, fontWeight: 700, color: PAPER, textAlign: 'center' }} />
      <Words name="End CTA" text={cta} delay={1.1 * fps} style={{ position: 'absolute', top: 1160, right: 90, left: 90, fontSize: 46, fontWeight: 500, color: LIME, textAlign: 'center' }} />
    </>
  );
};
const End = Interactive.create({ Component: EndInner, layout: 'absolute-fill', schema: { ...Interactive.backgroundSchema, line: { type: 'string', default: '', description: 'Line' }, cta: { type: 'string', default: '', description: 'Call to action' } } });

/* ---------- the reel ---------- */
const Music = () => {
  const { fps, durationInFrames } = useVideoConfig();
  // "Coffee or Tea" by Michael Ramir C., Mixkit #1168, Mixkit Stock Music Free License (commercial social use allowed, checked 17 Nov 2026).
  // Downloaded by scripts/fetch_music.sh, never committed. Starts on its first beat after the intro (17.9 s).
  return <Audio name="Music" src={staticFile('music/mixkit-1168.mp3')} trimBefore={Math.round(17.9 * fps)}
    volume={(f) => interpolate(f, [0, durationInFrames - 0.6 * fps, durationInFrames], [0.55, 0.55, 0], clamp)} />;
};

export const STAMP_REEL_FRAMES = 2.6 * 30 + 2 * 30 + 2.4 * 30 + 2.4 * 30 + 2 * 30 + 3 * 30 - 5 * 12;

export const StampReel = () => {
  const { fps } = useVideoConfig();
  const t = 12; // transition length, frames
  return (
    <>
      <TransitionSeries name="Scenes">
        <TransitionSeries.Sequence name="Hook" durationInFrames={2.6 * fps}>
          <Hook title="למה הקפה העשירי" line="אף פעם לא מגיע?" style={{ backgroundColor: INK }} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={iris({ width: W, height: H })} timing={linearTiming({ durationInFrames: t, easing: Easing.bezier(0.7, 0, 0.84, 0) })} />
        <TransitionSeries.Sequence name="Home" durationInFrames={2 * fps}>
          <Home title="כי הכרטיסייה נשארה בבית." line="שוב." style={{ backgroundColor: LIME }} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: 'from-bottom' })} timing={springTiming({ config: { damping: 200 }, durationInFrames: t })} />
        <TransitionSeries.Sequence name="Wallet" durationInFrames={2.4 * fps}>
          <Wallet title="כרטיסיות בארנק. אף אחת לא מלאה." style={{ backgroundColor: PAPER }} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-left' })} timing={springTiming({ config: { damping: 200 }, durationInFrames: t })} />
        <TransitionSeries.Sequence name="App" durationInFrames={2.4 * fps}>
          <App title="כולן בטלפון אחד." style={{ backgroundColor: INK }} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={pushCut({ flashColor: LIME })} timing={linearTiming({ durationInFrames: t })} />
        <TransitionSeries.Sequence name="Full" durationInFrames={2 * fps}>
          <Full title="מלאה." line="והפעם, בלי לחפש." style={{ backgroundColor: LIME }} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={clockWipe({ width: W, height: H })} timing={linearTiming({ durationInFrames: t })} />
        <TransitionSeries.Sequence name="End" durationInFrames={3 * fps}>
          <End line="כרטיסייה אחת לכל השכונה." cta="לבעלי עסקים: גישה מוקדמת בחינם · הקישור בביו" style={{ backgroundColor: INK }} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Track name="Music">
        <Music />
      </Track>
      {/* sound effects (CC0 kit from the sound-effects skill, public/daily/kit), on the frames where things land */}
      <Track name="Hook sounds">
        <Audio name="Card lands" src={staticFile('daily/kit/impact.ogg')} from={0.25 * fps} durationInFrames={fps} volume={0.3} />
      </Track>
      <Track name="Transitions">
        <Audio name="Whoosh 1" src={staticFile('daily/kit/whoosh.ogg')} from={2.6 * fps - t} durationInFrames={fps} volume={0.45} />
        <Audio name="Whoosh 2" src={staticFile('daily/kit/whoosh.ogg')} from={4.6 * fps - 2 * t} durationInFrames={fps} volume={0.45} />
        <Audio name="Whoosh 3" src={staticFile('daily/kit/whoosh.ogg')} from={7 * fps - 3 * t} durationInFrames={fps} volume={0.45} />
        <Audio name="Flash" src={staticFile('daily/kit/impact.ogg')} from={9.4 * fps - 4 * t + t / 2} durationInFrames={fps} volume={0.2} />
        <Audio name="Whoosh 5" src={staticFile('daily/kit/whoosh.ogg')} from={11.4 * fps - 5 * t} durationInFrames={fps} volume={0.45} />
      </Track>
      <Track name="Story sounds">
        <Audio name="Tap" src={staticFile('daily/kit/ding.ogg')} from={7 * fps - 3 * t + 1.2 * fps} durationInFrames={fps} volume={0.35} />
        <Audio name="Last stamp" src={staticFile('daily/kit/impact.ogg')} from={9.4 * fps - 4 * t + 0.4 * fps} durationInFrames={fps} volume={0.24} />
        <Audio name="Logo" src={staticFile('daily/kit/pop.ogg')} from={11.4 * fps - 5 * t + 0.2 * fps} durationInFrames={fps} volume={0.6} />
      </Track>
    </>
  );
};
