import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { C } from '../tokens';
import { snap, accel, drift, lin, rnd } from '../motion';
import { Blur } from '../components/Blur';
import { Letters } from '../components/Letters';
import { WriteOn, impactStyle, accentStyle } from '../components/Kinetic';
import { Wordmark } from '../components/Wordmark';
import { W, H, BEAT, BAR, LIME, INK, PAPER, MUTED, clamp, fit, Field, monoStyle, Overline, Decode, Hud916, HudScene } from '../Reel';

// The daily reel: one template, four formats, driven by a JSON spec (content/daily/*.json).
// Motion DNA: 120 BPM (beat 15 f, bar 60 f), one scene per bar, expo snaps with motion blur, a shape from each
// scene opens the next, rotating fields, the mirrored HUD, the lime dot from the hook to the wordmark.
// Layout: everything sits between y 380 and y 1560 (Instagram's caption and buttons cover the bottom).

export const spec = z.object({
  id: z.string(),
  format: z.enum(['tips', 'myth', 'pov', 'flags']),
  topic: z.string(), // HUD label, e.g. "טיפים לעסקים"
  hook: z.string(), // impact words, 1-3 words, no digits
  hookAccent: z.string(), // the human line under the hook
  items: z.array(z.object({ title: z.string(), body: z.string().optional(), tag: z.string().optional() })).min(1).max(4),
  cta: z.object({ big: z.string(), accent: z.string(), mono: z.string() }),
  music: z.number().int().min(1).max(4),
  caption: z.string(),
  hashtags: z.array(z.string()).max(5),
});
export type DailySpec = z.infer<typeof spec>;

export const END_LEN = 75;
export const dailyFrames = (s: DailySpec) => (2 + s.items.length) * BAR + END_LEN;

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
  const f = useCurrentFrame();
  const push = drift(f, 2, 1, 1.03, 44);
  const g = accel(f, 46, 0, 1, 14);
  const dotIn = snap(f, 12, 0, 1, 8);
  return (
    <Field k="lime">
      <Decode f={f} at={1} text={`פרקו / ${s.topic}`} style={{ ...monoStyle(26, MUTED), position: 'absolute', top: 470, right: 90 }} />
      <div style={{ position: 'absolute', top: 560, left: 60, right: 90, transform: `scale(${push})`, transformOrigin: '80% 30%' }}>
        <Words text={s.hook} f={f} at={2} size={size2(s.hook, 250)} color={INK} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <WriteOn g={f} at={BEAT + 1} style={{ ...accentStyle(fit(s.hookAccent, 110, 880), INK) }}>{s.hookAccent}</WriteOn>
        </div>
      </div>
      <div style={{ position: 'absolute', left: W / 2 - 40, top: 1260, width: 80, height: 80, borderRadius: '50%', background: NEXT[next], transform: `scale(${f < 46 ? dotIn * (1 + 0.05 * Math.sin(f / 3)) : 1 + g * 50})` }} />
    </Field>
  );
};

/* --- one item per bar; layout depends on the format --- */
const Item: React.FC<{ s: DailySpec; i: number; k: FieldKey; next: FieldKey }> = ({ s, i, k, next }) => {
  const f = useCurrentFrame();
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
      <Overline f={f} at={1} label={label} n={`${n}/${total}`} color={c.sub} top={460} />
      <div style={{ position: 'absolute', top: 560, left: 70, right: 90, transform: `scale(${push})`, transformOrigin: '90% 20%' }}>
        <div style={{ position: 'relative', display: 'inline-block', maxWidth: 920 }}>
          <Words text={it.title} f={f} at={3} size={size2(it.title, 210, 920)} color={c.fg} />
          {strike > 0 && <div style={{ position: 'absolute', right: 0, top: '52%', height: 14, width: `${strike * 100}%`, background: c.fg, borderRadius: 7 }} />}
        </div>
        {it.body && (
          <div style={{ marginTop: 40, maxWidth: 900 }}>
            <WriteOn g={f} at={BEAT + 2} style={{ ...accentStyle(80, c.fg), whiteSpace: 'normal', lineHeight: 1.2, textAlign: 'right' }}>{it.body}</WriteOn>
          </div>
        )}
      </div>
      {/* the signal: a dot (tips, pov), a flag (flags) or a tick (myth facts) */}
      <div style={{ position: 'absolute', left: 120, top: 1300, width: 90, height: 90, borderRadius: '50%', transform: `scale(${markIn})`,
        background: flag ?? (k === 'ink' ? LIME : INK), display: 'grid', placeItems: 'center' }}>
        {s.format === 'myth' && i % 2 === 1 && <svg width="50" height="50" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={k === 'ink' ? INK : LIME} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <Out f={f} kind={i + 1} to={next} x={165} y={1345} />
    </Field>
  );
};

/* --- call to action (lime) --- */
const Cta: React.FC<{ s: DailySpec }> = ({ s }) => {
  const f = useCurrentFrame();
  const push = drift(f, 0, 1, 1.025, 44);
  const g = accel(f, 46, 0, 1, 14);
  return (
    <Field k="lime">
      <div style={{ position: 'absolute', top: 640, left: 60, right: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${push})` }}>
        <Words text={s.cta.big} f={f} at={1} size={size2(s.cta.big, 230)} color={INK} center />
        <div style={{ marginTop: 26, width: 940, display: 'flex', justifyContent: 'center' }}><WriteOn g={f} at={BEAT} style={accentStyle(fit(s.cta.accent, 92, 900), INK)}>{s.cta.accent}</WriteOn></div>
        <div style={{ marginTop: 50 }}><Decode f={f} at={2 * BEAT} text={s.cta.mono} style={monoStyle(32, MUTED)} /></div>
      </div>
      <div style={{ position: 'absolute', left: W / 2 - 50, top: 1300, width: 100, height: 100, borderRadius: '50%', background: INK, transform: `scale(${f < 46 ? snap(f, 24, 0, 1, 8) : 1 + g * 45})` }} />
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

export const DailyReel: React.FC<DailySpec> = (s) => {
  const n = s.items.length;
  const fields = s.items.map((_, i) => ROT[i % ROT.length]!);
  const total = dailyFrames(s);
  const hud: HudScene[] = s.items.map((_, i) => ({ from: (1 + i) * BAR, to: (2 + i) * BAR, tag: s.topic, dark: fields[i] === 'ink' }));
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Audio src={staticFile(`daily/music-${s.music}.wav`)} volume={(f) => interpolate(f, [0, total - 20, total], [0.85, 0.85, 0], clamp)} />
      <Sequence from={0} durationInFrames={BAR}><Hook s={s} next={fields[0]!} /></Sequence>
      {s.items.map((_, i) => (
        <Sequence key={i} from={(1 + i) * BAR} durationInFrames={BAR}><Item s={s} i={i} k={fields[i]!} next={i === n - 1 ? 'lime' : fields[i + 1]!} /></Sequence>
      ))}
      <Sequence from={(1 + n) * BAR} durationInFrames={BAR}><Cta s={s} /></Sequence>
      <Sequence from={(2 + n) * BAR} durationInFrames={END_LEN}><End /></Sequence>
      <Hud916 scenes={hud} label="פרקו - יומי" />
    </AbsoluteFill>
  );
};
