import React, { createContext, useContext } from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { C } from '../tokens';
import { snap, accel, drift, lin, rnd } from '../motion';
import { Blur } from '../components/Blur';
import { Letters } from '../components/Letters';
import { WriteOn, impactStyle, accentStyle } from '../components/Kinetic';
import { Wordmark } from '../components/Wordmark';
import { Prop, propHit, visual, type Visual } from './Props';
import { W, H, BEAT, BAR, LIME, INK, PAPER, MUTED, clamp, fit, Field, monoStyle, Overline, Decode, Hud916, HudScene } from '../Reel';

// The daily reel: one template, four formats, driven by a JSON spec (content/daily/*.json).
// Motion DNA: 120 BPM (beat 15 f, bar 60 f), one scene per bar, expo snaps with motion blur, a shape from each
// scene opens the next, rotating fields, the mirrored HUD, the lime dot from the hook to the wordmark.
// Layout: everything sits between y 380 and y 1560 (Instagram's caption and buttons cover the bottom).

export const spec = z.object({
  id: z.string(),
  format: z.enum(['tips', 'myth', 'pov', 'flags']),
  topic: z.string(), // HUD label, e.g. "טיפים לעסקים"
  hookType: z.string().optional(), // content/HOOKS.md
  hook: z.string(), // impact words, 1-4 words, on screen from frame 0
  hookAccent: z.string(), // the human line under the hook
  items: z.array(z.object({ title: z.string(), body: z.string().optional(), tag: z.string().optional(), visual: visual.optional() })).min(1).max(4),
  hookVisual: visual.optional(), // the object under the hook (src/daily/Props.tsx)
  ctaVisual: visual.optional(),
  cta: z.object({ big: z.string(), accent: z.string(), mono: z.string() }),
  music: z.number().int().min(1).max(4),
  caption: z.string(),
  hashtags: z.array(z.string()).max(5),
  // narration (content/voiceover.py): one clip per scene (hook, each item, cta) in public/daily/vo/, with its length in seconds
  vo: z.object({ voice: z.string(), scenes: z.array(z.object({ file: z.string(), dur: z.number() })) }).optional(),
  sfx: z.boolean().optional(),
});
export type DailySpec = z.infer<typeof spec>;

export const END_LEN = 75;
const VO_LEAD = 6, VO_TAIL = 12;
const lead = (i: number) => (i === 0 ? 1 : VO_LEAD); // frames of air before and after a line inside its scene
/** Each scene is one bar, or as many whole beats as its narration needs. */
export const sceneLens = (s: DailySpec) => Array.from({ length: s.items.length + 2 }, (_, i) => {
  const d = s.vo?.scenes[i]?.dur;
  return d ? Math.max(BAR, Math.ceil((d * 30 + lead(i) + VO_TAIL) / BEAT) * BEAT) : BAR;
});
export const dailyFrames = (s: DailySpec) => sceneLens(s).reduce((a, b) => a + b, 0) + END_LEN;

/* A scene longer than a bar plays its entrance and its exit at the normal speed and slows the middle (frames 30-46). */
const Stretch = createContext(0);
const A = 30, B = 46;
const useSF = () => {
  const f = useCurrentFrame(), extra = useContext(Stretch);
  if (!extra || f < A) return f;
  if (f < B + extra) return A + ((f - A) * (B - A)) / (B - A + extra);
  return f - extra;
};

type FieldKey = 'ink' | 'paper' | 'lime' | 'tint';

/** Impact text that may wrap: each word reveals letter by letter, words wrap whole (never mid-word). */
const size2 = (t: string, max: number, w = 940) => {
  const words = t.split(' ');
  const longest = Math.max(...words.map((x) => Array.from(x).length));
  const one = fit(t, max, w);
  // prefer two lines when one line would be small: size by the longer half
  const half = Math.ceil(Array.from(t).length / 2) + 1;
  return Math.min(max, Math.max(one, Math.round(w / (Math.max(longest, half) * 0.6))));
};
const Words: React.FC<{ text: string; f: number; at: number; size: number; color: string; center?: boolean }> = ({ text, f, at, size, color, center }) => {
  let k = 0;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', direction: 'rtl', columnGap: size * 0.28, rowGap: size * 0.06, justifyContent: center ? 'center' : 'flex-start' }}>
      {text.split(' ').map((w, i) => {
        const start = at + k * 1.5; k += Array.from(w).length + 1;
        return <Letters key={i} text={w} f={f} at={start} style={{ ...impactStyle(size, color), lineHeight: 1.04 }} />;
      })}
    </div>
  );
};
/** The hook is on screen whole from the first frame (a muted viewer decides in about a second; see content/HOOKS.md).
 *  Whole words in one span, so digits keep their order. */
const Static: React.FC<{ text: string; size: number; color: string }> = ({ text, size, color }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', direction: 'rtl', columnGap: size * 0.28, rowGap: size * 0.06 }}>
    {text.split(' ').map((w, i) => <span key={i} style={{ ...impactStyle(size, color), lineHeight: 1.04, unicodeBidi: 'plaintext' }}>{w}</span>)}
  </div>
);
/** Captions that arrive word by word with the narrator, the spoken word marked (the TikTok/Reels caption style).
 *  Word times are estimated from the clip's length in proportion to the characters (pauses after punctuation). */
const Caption: React.FC<{ text: string; f: number; from: number; dur: number; size: number; color: string; mark: string; markInk: string }> = ({ text, f, from, dur, size, color, mark, markInk }) => {
  const words = text.split(' ');
  const wt = words.map((w) => Array.from(w).length + 1 + (/[.,?!:]$/.test(w) ? 4 : 0));
  const tot = wt.reduce((a, b) => a + b, 0);
  let acc = 0;
  const at = wt.map((x) => { const t = from + (dur * acc) / tot; acc += x; return t; });
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', direction: 'rtl', columnGap: size * 0.26, rowGap: size * 0.18 }}>
      {words.map((w, i) => {
        if (f < at[i]!) return <span key={i} style={{ ...accentStyle(size, 'transparent'), lineHeight: 1.15 }}>{w}</span>;
        const now = f < (at[i + 1] ?? from + dur + 6);
        const s = snap(f, at[i]!, 0.75, 1, 4);
        return <span key={i} style={{ ...accentStyle(size, now ? markInk : color), lineHeight: 1.15, transform: `scale(${s})`, display: 'inline-block',
          background: now ? mark : 'transparent', borderRadius: 14, padding: '0 10px', margin: '0 -10px', unicodeBidi: 'plaintext' }}>{w}</span>;
      })}
    </div>
  );
};

const ROT: FieldKey[] = ['paper', 'ink', 'tint', 'ink', 'paper'];
const onField = (k: FieldKey) => (k === 'ink' ? { fg: PAPER, sub: C.onInk, dark: true } : { fg: INK, sub: MUTED, dark: false });

/* --- transitions: the device is drawn by the outgoing scene, in the next scene's colour --- */
const NEXT: Record<FieldKey, string> = { ink: INK, paper: PAPER, lime: LIME, tint: C.tint };
const Out: React.FC<{ f: number; kind: number; to: FieldKey; x?: number; y?: number }> = ({ f, kind, to, x = W / 2, y = 1300 }) => {
  if (f < 46) return null;
  const col = NEXT[to];
  if (kind % 3 === 0) { // the dot grows into a mask (device 2)
    const g = accel(f, 46, 0, 1, 14);
    return <div style={{ position: 'absolute', left: x - 50, top: y - 50, width: 100, height: 100, borderRadius: '50%', background: col, transform: `scale(${g * 45})` }} />;
  }
  if (kind % 3 === 1) { // horizontal slices (device 5)
    return <>{Array.from({ length: 10 }, (_, i) => {
      const p = snap(f, 50 + (i % 3), 0, 1, 6);
      const off = (1 - p) * (W * (0.6 + rnd(i * 13 + kind) * 0.6)) * (i % 2 ? 1 : -1);
      return <div key={i} style={{ position: 'absolute', left: off, top: (H / 10) * i, width: W, height: H / 10 + 1, background: col }} />;
    })}</>;
  }
  return <>{[0, 1, 2].map((j) => { // diagonal slabs (device 7)
    const p = accel(f, 47 + j * 2, 0, 1, 9);
    return <div key={j} style={{ position: 'absolute', left: -1400 + p * 2600 - j * 260, top: -400, width: 900, height: H + 800, background: j === 1 ? LIME : col, transform: 'rotate(-20deg)' }} />;
  })}{f >= 55 && <AbsoluteFill style={{ background: col, opacity: lin(f, 55, 0, 1, 3) }} />}</>;
};

/* --- the hook (lime): impact words + accent; a dot in the next scene's colour grows into it --- */
const Hook: React.FC<{ s: DailySpec; next: FieldKey }> = ({ s, next }) => {
  const f = useSF();
  const punch = 1.14 - 0.14 * snap(f, 0, 0, 1, 7); // lands with a punch-in on frame 0
  const push = punch * drift(f, 7, 1, 1.03, 40);
  const g = accel(f, 46, 0, 1, 14);
  const dotIn = snap(f, 8, 0, 1, 8);
  return (
    <Field k="lime">
      <Decode f={f} at={1} text={`פרקו / ${s.topic}`} style={{ ...monoStyle(26, MUTED), position: 'absolute', top: 470, right: 90 }} />
      <div style={{ position: 'absolute', top: 560, left: 60, right: 90, transform: `scale(${push})`, transformOrigin: '80% 30%' }}>
        <Static text={s.hook} size={size2(s.hook, 250)} color={INK} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <WriteOn g={f} at={3} style={{ ...accentStyle(fit(s.hookAccent, 110, 880), INK) }}>{s.hookAccent}</WriteOn>
        </div>
      </div>
      {s.hookVisual && <Prop v={s.hookVisual} f={f} dark={false} />}
      {(!s.hookVisual || f >= 44) && <div style={{ position: 'absolute', left: W / 2 - 40, top: 1260, width: 80, height: 80, borderRadius: '50%', background: NEXT[next], transform: `scale(${f < 46 ? (s.hookVisual ? snap(f, 44, 0, 1, 2) : dotIn * (1 + 0.05 * Math.sin(f / 3))) : 1 + g * 50})` }} />}
    </Field>
  );
};

/* --- one item per bar; layout depends on the format --- */
const Item: React.FC<{ s: DailySpec; i: number; k: FieldKey; next: FieldKey; vo?: { from: number; dur: number } }> = ({ s, i, k, next, vo }) => {
  const f = useSF();
  const raw = useCurrentFrame();
  const it = s.items[i]!;
  const c = onField(k);
  const n = String(i + 1).padStart(2, '0');
  const total = String(s.items.length).padStart(2, '0');
  const label = s.format === 'tips' ? 'טיפ' : s.format === 'myth' ? (i % 2 === 0 ? 'מיתוס' : 'בפועל') : s.format === 'flags' ? (it.tag === 'green' ? 'דגל ירוק' : 'דגל אדום') : 'רגע';
  const flag = s.format === 'flags' ? (it.tag === 'green' ? LIME : '#FF5A3C') : null;
  const strike = s.format === 'myth' && i % 2 === 0 ? snap(f, 30, 0, 1, 8) : 0;
  const push = drift(f, 10, 1, 1.025, 40);
  const markIn = snap(f, 4, 0, 1, 8);
  return (
    <Field k={k}>
      <Overline f={f} at={1} label={label} n={`${n}/${total}`} color={c.sub} top={it.visual ? 420 : 460} />
      <div style={{ position: 'absolute', top: it.visual ? 490 : 560, left: 70, right: 90, transform: `scale(${push})`, transformOrigin: '90% 20%' }}>
        <div style={{ position: 'relative', display: 'inline-block', maxWidth: 920 }}>
          <Words text={it.title} f={f} at={3} size={size2(it.title, it.visual ? 150 : 210, 920)} color={c.fg} />
          {strike > 0 && <div style={{ position: 'absolute', right: 0, top: '52%', height: 14, width: `${strike * 100}%`, background: c.fg, borderRadius: 7 }} />}
        </div>
        {it.body && vo && (() => {
          const share = Array.from(it.title).length / (Array.from(it.title).length + Array.from(it.body).length + 2);
          return <div style={{ marginTop: 30, maxWidth: 920 }}>
            <Caption text={it.body} f={raw} from={vo.from + vo.dur * share} dur={vo.dur * (1 - share)} size={it.visual ? 64 : 80} color={c.fg} mark={k === 'ink' ? LIME : INK} markInk={k === 'ink' ? INK : PAPER} />
          </div>;
        })()}
        {it.body && !vo && (
          <div style={{ marginTop: 40, maxWidth: 900 }}>
            <WriteOn g={f} at={BEAT + 2} style={{ ...accentStyle(80, c.fg), whiteSpace: 'normal', lineHeight: 1.2, textAlign: 'right' }}>{it.body}</WriteOn>
          </div>
        )}
      </div>
      {it.visual && <Prop v={it.visual} f={f} dark={k === 'ink'} />}
      {/* the signal: a dot (tips, pov), a flag (flags) or a tick (myth facts) */}
      <div style={{ position: 'absolute', left: 120, top: 1300, width: 90, height: 90, borderRadius: '50%', transform: `scale(${it.visual ? 0 : markIn})`,
        background: flag ?? (k === 'ink' ? LIME : INK), display: 'grid', placeItems: 'center' }}>
        {s.format === 'myth' && i % 2 === 1 && <svg width="50" height="50" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={k === 'ink' ? INK : LIME} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <Out f={f} kind={i + 1} to={next} x={165} y={1345} />
    </Field>
  );
};

/* --- call to action (lime) --- */
const Cta: React.FC<{ s: DailySpec }> = ({ s }) => {
  const f = useSF();
  const push = drift(f, 0, 1, 1.025, 44);
  const g = accel(f, 46, 0, 1, 14);
  return (
    <Field k="lime">
      <div style={{ position: 'absolute', top: s.ctaVisual ? 420 : 640, left: 60, right: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${push})` }}>
        <Words text={s.cta.big} f={f} at={1} size={size2(s.cta.big, 230)} color={INK} center />
        <div style={{ marginTop: 26, width: 940, display: 'flex', justifyContent: 'center' }}><WriteOn g={f} at={BEAT} style={accentStyle(fit(s.cta.accent, 92, 900), INK)}>{s.cta.accent}</WriteOn></div>
        <div style={{ marginTop: 50 }}><Decode f={f} at={2 * BEAT} text={s.cta.mono} style={monoStyle(32, MUTED)} /></div>
      </div>
      {s.ctaVisual && <Prop v={s.ctaVisual} f={f} dark={false} />}
      {(!s.ctaVisual || f >= 44) && <div style={{ position: 'absolute', left: W / 2 - 50, top: 1300, width: 100, height: 100, borderRadius: '50%', background: INK, transform: `scale(${f < 46 ? (s.ctaVisual ? snap(f, 44, 0, 1, 2) : snap(f, 24, 0, 1, 8)) : 1 + g * 45})` }} />}
    </Field>
  );
};

/* --- end (ink): the lime dot writes the wordmark --- */
const End: React.FC = () => {
  const f = useCurrentFrame();
  const p = snap(f, 4, 0, 1, 20);
  const landed = f >= 24;
  return (
    <Field k="ink">
      <div style={{ position: 'absolute', top: 720, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', fontSize: 200 }}>
          <Wordmark size={200} color={PAPER} disc={LIME} reveal={p} hideDisc={!landed} />
          {!landed && f >= 4 && (
            <Blur x={Math.abs(snap(f, 4, 0, 1, 20) - snap(f - 1, 4, 0, 1, 20)) * 400}>
              <span style={{ position: 'absolute', top: '0.47em', left: `calc(${p * 100}% - 0.5em)`, width: '0.5em', height: '0.5em', borderRadius: '50%', background: LIME, boxShadow: '0 0 60px 20px rgba(215,255,53,.35)' }} />
            </Blur>
          )}
        </div>
        <div style={{ marginTop: 60, width: 900, display: 'flex', justifyContent: 'flex-end' }}><WriteOn g={f} at={28} style={accentStyle(70, PAPER)}>כל ההטבות. מקום אחד.</WriteOn></div>
        <div style={{ marginTop: 40, width: lin(f, 36, 0, 700, 8), height: 1, background: 'rgba(248,248,244,.4)' }} />
        <div style={{ marginTop: 34 }}><Decode f={f} at={40} text="getperko.com" style={{ ...monoStyle(30, C.onInk), direction: 'ltr' }} /></div>
      </div>
    </Field>
  );
};

/* Sound effects (music/sfx_fetch.py, Mixkit). trim: frames of lead-in cut off; peak: frames from the cut to the hit,
   so a hit can be placed on the frame it belongs to; vol: levels them against each other. */
const FX = {
  'hook-hit': { trim: 12, peak: 4, vol: 1 }, 'whoosh-1': { trim: 15, peak: 17, vol: 0.6 }, 'whoosh-2': { trim: 2, peak: 1, vol: 1 },
  'whoosh-3': { trim: 3, peak: 5, vol: 0.5 }, pop: { trim: 0, peak: 1, vol: 0.8 }, 'pop-soft': { trim: 0, peak: 1, vol: 0.4 },
  wrong: { trim: 0, peak: 7, vol: 0.45 }, right: { trim: 0, peak: 1, vol: 0.55 }, strike: { trim: 1, peak: 9, vol: 1 },
  rise: { trim: 9, peak: 4, vol: 0.5 }, ding: { trim: 0, peak: 0, vol: 0.7 }, punch: { trim: 0, peak: 2, vol: 1 },
} as const;
type Fx = keyof typeof FX;
/** plays `name` so that its hit lands on frame `hit` */
const Sfx: React.FC<{ hit: number; name: Fx; gain?: number }> = ({ hit, name, gain = 1 }) => {
  const x = FX[name];
  const from = Math.round(hit - x.peak);
  const cut = x.trim + Math.max(0, -from);
  return <Sequence from={Math.max(0, from)} durationInFrames={60} layout="none"><Audio src={staticFile(`daily/sfx/${name}.mp3`)} trimBefore={cut} volume={x.vol * gain} /></Sequence>;
};

/** A thin bar that fills over the reel: how much is left (a retention device of the format) */
const Progress: React.FC<{ total: number }> = ({ total }) => {
  const f = useCurrentFrame();
  return <div style={{ position: 'absolute', top: 300, left: 90, right: 90, height: 8, borderRadius: 4, background: 'rgba(128,128,120,.35)', direction: 'rtl', display: 'flex' }}>
    <div style={{ width: `${(f / total) * 100}%`, height: '100%', background: INK, marginLeft: 'auto', borderRadius: 4, boxShadow: `0 0 0 2px ${PAPER}` }} />
  </div>;
};

export const DailyReel: React.FC<DailySpec> = (s) => {
  const n = s.items.length;
  const fields = s.items.map((_, i) => ROT[i % ROT.length]!);
  const total = dailyFrames(s);
  const lens = sceneLens(s);
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
  const endAt = starts[n + 1]! + lens[n + 1]!;
  const hud: HudScene[] = s.items.map((_, i) => ({ from: starts[1 + i]!, to: starts[2 + i]!, tag: s.topic, dark: fields[i] === 'ink' }));
  const vo = s.vo?.scenes ?? [];
  const spans = vo.map((v, i) => [starts[i]! + lead(i), starts[i]! + lead(i) + Math.ceil(v.dur * 30)] as const);
  const music = (f: number) => {
    const ducked = spans.some(([a, b]) => f >= a - 4 && f <= b + 6);
    return interpolate(f, [0, total - 20, total], [1, 1, 0], clamp) * (ducked ? 0.28 : vo.length ? 0.7 : 0.85);
  };
  const fx = s.sfx !== false;
  const scene = (i: number, el: React.ReactNode) => (
    <Sequence key={i} from={starts[i]!} durationInFrames={lens[i]!}><Stretch.Provider value={lens[i]! - BAR}>{el}</Stretch.Provider></Sequence>
  );
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Audio src={staticFile(`daily/music-${s.music}.wav`)} volume={music} loop trimBefore={BAR} /* skip the loop's quiet intro bar: the beat is there on frame 0 */ />
      {scene(0, <Hook s={s} next={fields[0]!} />)}
      {s.items.map((_, i) => scene(1 + i, <Item s={s} i={i} k={fields[i]!} next={i === n - 1 ? 'lime' : fields[i + 1]!} vo={vo[1 + i] ? { from: lead(1 + i), dur: vo[1 + i]!.dur * 30 } : undefined} />))}
      {scene(1 + n, <Cta s={s} />)}
      <Sequence from={endAt} durationInFrames={END_LEN}><End /></Sequence>
      <Hud916 scenes={hud} label="פרקו - יומי" />
      <Progress total={total} />
      {vo.map((v, i) => (
        <Sequence key={`vo${i}`} from={starts[i]! + lead(i)} durationInFrames={Math.ceil(v.dur * 30) + 10} layout="none"><Audio src={staticFile(`daily/vo/${v.file}`)} volume={1} /></Sequence>
      ))}
      {fx && <>
        <Sfx hit={0} name="hook-hit" />
        {lens.map((L, i) => <Sfx key={`w${i}`} hit={starts[i]! + L - 10} name={(['whoosh-1', 'whoosh-2', 'whoosh-3'] as const)[i % 3]!} />)}
        {s.items.map((it, i) => {
          const at = starts[1 + i]!;
          if (s.format === 'myth') return i % 2 === 0
            ? <React.Fragment key={`m${i}`}><Sfx hit={at + 34} name="strike" /><Sfx hit={at + 40} name="wrong" /></React.Fragment>
            : <Sfx key={`m${i}`} hit={at + 5} name="right" />;
          if (s.format === 'flags') return <Sfx key={`f${i}`} hit={at + 5} name={it.tag === 'green' ? 'right' : 'wrong'} />;
          if (it.visual) {
            const h = propHit(it.visual), nm = ({ stamp: 'hook-hit', card: 'pop', phone: 'whoosh-3', chat: 'pop-soft', stars: 'ding' } as Record<string, Fx>)[it.visual.type];
            return h != null && nm ? <Sfx key={`v${i}`} hit={at + h} name={nm} /> : <Sfx key={`p${i}`} hit={at + 5} name="pop" />;
          }
          return <Sfx key={`p${i}`} hit={at + 5} name={i % 2 ? 'pop-soft' : 'pop'} />;
        })}
        <Sfx hit={starts[1 + n]!} name="rise" />
        <Sfx hit={starts[1 + n]! + 2 * BEAT} name="ding" gain={0.8} />
        <Sfx hit={endAt + 24} name="punch" />
      </>}
    </AbsoluteFill>
  );
};
