import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { impact, mono } from './fonts';
import { C } from './tokens';
import { snap, accel, drift, lin, rnd } from './motion';
import { Blur } from './components/Blur';
import { Letters } from './components/Letters';
import { WriteOn, impactStyle, accentStyle } from './components/Kinetic';
import { Wordmark } from './components/Wordmark';
import { W, H, BEAT, BAR, LIME, INK, PAPER, MUTED, clamp, fit, Field, monoStyle, Overline, Decode, Hud916, HudScene } from './Reel';

// "The race for the golden card" - explains the referral game to residents. Motion DNA, flat (no 3D), 9:16, 30 fps,
// 120 BPM (beat 15 f, bar 60 f), one scene per bar. Silent: the user adds the track in Instagram.
// Story: a lime spark (boot) -> the game's name -> 1 comment -> 2 your card in DM -> 3 every friend is a stamp
// -> the weekly top 10 -> the prize -> comment now -> the wordmark.
// The golden card is drawn in brand lime, not metallic gold: the palette has no gold (PROJECT_BRIEF §3).
// Names and numbers on screen are samples and say so.
const R = (n: number) => n * BAR;
export const RACE_FRAMES = R(8) + 75;

/* Boot (ink): a lime spark falls and becomes the dot; the dot grows into the lime field (device: dot -> mask). */
const Boot: React.FC = () => {
  const f = useCurrentFrame();
  const fall = (x: number) => snap(x, 6, -900, 0, 9);
  const v = Math.abs(fall(f) - fall(f - 1));
  const grow = accel(f, 46, 1, 60, 14);
  const pulse = 1 + 0.06 * Math.sin(f / 3);
  return (
    <Field k="ink">
      <Decode f={f} at={2} text="פרקו / משחק בשכונה - 2026" style={{ ...monoStyle(26, C.onInk), position: 'absolute', top: 470, right: 90 }} />
      <div style={{ position: 'absolute', top: 560, left: 60, right: 90 }}>
        <Letters text="משחק חדש" f={f} at={4} style={impactStyle(fit('משחק חדש', 230, 900), PAPER)} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}><WriteOn g={f} at={BEAT + 2} style={accentStyle(110, PAPER)}>בשכונה.</WriteOn></div>
      </div>
      {f >= 6 && (
        <Blur y={v * 0.6}>
          <div style={{ position: 'absolute', left: W / 2 - 40, top: 1220 + fall(f), width: 80, height: 80, borderRadius: '50%', background: LIME,
            transform: `scale(${f < 46 ? pulse : grow})`, boxShadow: f < 46 ? '0 0 70px 24px rgba(215,255,53,.3)' : undefined }} />
        </Blur>
      )}
    </Field>
  );
};

/* Title (lime): the game's name; its baseline draws, thickens and blooms into the flash on the drop (device 1). */
const Title: React.FC = () => {
  const f = useCurrentFrame();
  const len = snap(f, 30, 0, 1, 9);
  const thick = accel(f, 48, 6, 160, 9);
  const push = drift(f, 2, 1, 1.03, 44);
  return (
    <Field k="lime">
      <Overline f={f} at={1} label="המשחק" n="01" color={MUTED} top={560} />
      <div style={{ position: 'absolute', top: 680, left: 60, right: 90, transform: `scale(${push})`, transformOrigin: '80% 30%' }}>
        <Letters text="המרוץ" f={f} at={2} style={impactStyle(fit('המרוץ', 300), INK)} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}><WriteOn g={f} at={BEAT + 1} style={accentStyle(124, INK)}>לכרטיס הזהב.</WriteOn></div>
      </div>
      <div style={{ position: 'absolute', right: 90, top: 1180 }}><Decode f={f} at={2 * BEAT} text="3 שלבים · 10 חותמות · מנצח אחד" style={monoStyle(30, MUTED)} /></div>
      <div style={{ position: 'absolute', right: 0, top: 1330 - thick / 2, width: W * len, height: thick, background: f >= 48 ? '#FFFDF2' : INK, boxShadow: f >= 48 ? '0 0 120px 50px #FFFDF2' : undefined }} />
    </Field>
  );
};
const Flash: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: 'radial-gradient(80% 45% at 50% 69%, #FFFFFF 0%, #FCFBF6 70%)', opacity: interpolate(f, [0, 2, 4, 12], [0, 1, 1, 0], clamp), pointerEvents: 'none' }} />;
};

/* Step 1 (paper): comment "אני בפנים"; the comment collapses into a glowing square that becomes the ink field (device 10). */
const PHRASE = 'אני בפנים';
const Comment: React.FC = () => {
  const f = useCurrentFrame();
  const inY = snap(f, 4, 160, 0, 9);
  const typed = Array.from(PHRASE).slice(0, Math.max(0, Math.floor((f - 14) / 2))).join('');
  const sent = f >= 34;
  const col = accel(f, 42, 0, 1, 8);
  const fill = accel(f, 50, 0, 1, 10);
  const bw = 900 - col * 760, bh = 170 - col * 30;
  return (
    <Field k="paper">
      <Overline f={f} at={1} label="שלב ראשון" n="1/3" color={MUTED} top={430} />
      <div style={{ position: 'absolute', top: 520, left: 60, right: 90 }}>
        <Letters text="תגיבו" f={f} at={2} style={impactStyle(fit('תגיבו', 280), INK)} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}><WriteOn g={f} at={BEAT + 2} style={accentStyle(96, INK)}>על הפוסט.</WriteOn></div>
      </div>
      <div style={{ position: 'absolute', left: W / 2 - bw / 2, top: 1080 - bh / 2 + inY, width: bw, height: bh, borderRadius: 44 + col * 10,
        background: col > 0 ? INK : '#FFFFFF', border: col > 0 ? 'none' : `3px solid ${INK}`, display: 'flex', alignItems: 'center', gap: 26, padding: col > 0.3 ? 0 : '0 36px',
        flexDirection: 'row-reverse', boxShadow: col > 0 ? `0 0 ${80 * col}px ${30 * col}px rgba(215,255,53,.45)` : '0 30px 60px -30px rgba(17,19,15,.35)' }}>
        {col < 0.3 && (
          <>
            <div style={{ width: 92, height: 92, borderRadius: '50%', background: C.tintStrong, flex: 'none' }} />
            <div style={{ flex: 1, direction: 'rtl', fontFamily: impact, fontWeight: 800, fontSize: 64, color: INK, whiteSpace: 'nowrap' }}>
              {typed}<span style={{ display: 'inline-block', width: 5, height: 60, background: INK, marginInlineStart: 6, verticalAlign: 'middle', opacity: sent || Math.floor(f / 6) % 2 ? 0 : 1 }} />
            </div>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: sent ? LIME : C.tint, border: `3px solid ${INK}`, flex: 'none', transform: `scale(${sent ? snap(f, 34, 1.3, 1, 6) : 1})` }} />
          </>
        )}
      </div>
      <div style={{ position: 'absolute', top: 1240, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: 1 - col }}>
        <Decode f={f} at={2 * BEAT} text="שתי מילים. זה הכל." style={monoStyle(32, MUTED)} />
      </div>
      {f >= 50 && <div style={{ position: 'absolute', left: W / 2 - 70 - fill * 1200, top: 1080 - 70 - fill * 2000, width: 140 + fill * 2400, height: 140 + fill * 4000, borderRadius: 54 * (1 - fill), background: INK }} />}
    </Field>
  );
};

/* The personal card (used in steps 2 and 3). `stamps` filled places; `link` shows the personal link row. */
const SLOT = (i: number) => ({ x: 760 - (i % 5) * 150, y: 300 + Math.floor(i / 5) * 140 });
const MyCard: React.FC<{ f: number; stamps: number; dark?: boolean; link?: boolean; stampAt?: (i: number) => number }> = ({ f, stamps, dark, link, stampAt }) => (
  <div style={{ position: 'relative', width: 900, height: 620, borderRadius: 48, background: dark ? INK : '#FCFBF6', boxShadow: '0 50px 90px -40px rgba(0,0,0,.55)' }}>
    <div style={{ position: 'absolute', top: 46, left: 56 }}><Wordmark size={54} color={dark ? LIME : INK} disc={dark ? LIME : INK} /></div>
    <div style={{ position: 'absolute', top: 40, right: 56, textAlign: 'right' }}>
      <div style={{ ...monoStyle(22, dark ? C.onInk : MUTED) }}>הכרטיס של</div>
      <div style={{ ...impactStyle(84, dark ? PAPER : INK) }}>נועה</div>
    </div>
    {Array.from({ length: 10 }, (_, i) => {
      const p = SLOT(i), on = i < stamps, at = stampAt ? stampAt(i) : 0, s = on ? snap(f, at, 1.6, 1, 6) : 1;
      return <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: 96, height: 96, borderRadius: '50%',
        background: on ? LIME : 'transparent', border: on ? 'none' : `4px dashed ${dark ? '#4A4F43' : C.tintStrong}`, transform: `scale(${s})` }} />;
    })}
    {link && <div style={{ position: 'absolute', bottom: 34, right: 56, left: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: mono, fontSize: 30, color: dark ? PAPER : INK, direction: 'ltr', letterSpacing: '0.04em', borderBottom: `3px solid ${dark ? LIME : INK}`, paddingBottom: 4 }}>getperko.com/r/noa</span>
      <span style={{ ...monoStyle(22, dark ? C.onInk : MUTED) }}>הקישור האישי</span>
    </div>}
  </div>
);

/* Step 2 (ink): the card with your name arrives in DM; the link's underline slices into the tint field (device 5). */
const Dm: React.FC = () => {
  const f = useCurrentFrame();
  const inY = (x: number) => snap(x, 6, 700, 0, 10);
  const v = Math.abs(inY(f) - inY(f - 1));
  const push = drift(f, 16, 1, 1.025, 34);
  return (
    <Field k="ink">
      <Overline f={f} at={1} label="שלב שני" n="2/3" color={C.onInk} top={430} />
      <div style={{ position: 'absolute', top: 520, left: 60, right: 90 }}>
        <Letters text="מקבלים בפרטי" f={f} at={2} style={impactStyle(fit('מקבלים בפרטי', 200), PAPER)} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}><WriteOn g={f} at={BEAT + 2} style={accentStyle(84, PAPER)}>כרטיס עם השם שלכם.</WriteOn></div>
      </div>
      <div style={{ position: 'absolute', left: 90, top: 860, transform: `translateY(${inY(f)}px) scale(${push})`, transformOrigin: '50% 0%' }}>
        <Blur y={v * 0.7}><MyCard f={f} stamps={0} link /></Blur>
      </div>
      <div style={{ position: 'absolute', top: 1520, left: 90 }}><Decode f={f} at={2 * BEAT + 4} text="שם לדוגמה" style={monoStyle(22, C.onInk)} /></div>
      {f >= 50 && Array.from({ length: 10 }, (_, i) => {
        const p = snap(f, 50 + (i % 3), 0, 1, 6);
        const off = (1 - p) * (W * (0.6 + rnd(i * 11) * 0.6)) * (i % 2 ? 1 : -1);
        return <div key={i} style={{ position: 'absolute', left: off, top: (H / 10) * i, width: W, height: H / 10 + 1, background: C.tint }} />;
      })}
    </Field>
  );
};

/* Step 3 (tint): one word per beat; each friend who joins stamps the card; the seventh stamp bursts (device 9). */
const STAMP_AT = [6, 12, 19, 25, 31, 37, 43];
const Stamps: React.FC = () => {
  const f = useCurrentFrame();
  const words = ['כל חבר', 'שמצטרף', 'דרככם'];
  const k = Math.min(3, Math.floor(f / BEAT));
  const n = STAMP_AT.filter((t) => f >= t).length;
  const last = { x: 90 + SLOT(6).x + 48, y: 860 + SLOT(6).y + 48 };
  const burst = snap(f, 48, 0, 1, 10), disc = accel(f, 50, 0, 1, 10);
  return (
    <Field k="tint">
      <Overline f={f} at={1} label="שלב שלישי" n="3/3" color={MUTED} top={430} />
      <div style={{ position: 'absolute', top: 530, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        {k < 3
          ? <Letters key={k} text={words[k]!} f={f} at={k * BEAT + 1} style={impactStyle(fit(words[k]!, 220), INK)} />
          : <WriteOn g={f} at={3 * BEAT + 1} style={accentStyle(170, INK)}>= חותמת.</WriteOn>}
      </div>
      <div style={{ position: 'absolute', left: 90, top: 860 }}><MyCard f={f} stamps={n} dark stampAt={(i) => STAMP_AT[i] ?? 0} /></div>
      <div style={{ position: 'absolute', top: 1520, right: 90 }}><Decode f={f} at={8} text={`${n} מתוך 10`} style={monoStyle(30, MUTED)} /></div>
      {f >= 48 && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          <circle cx={last.x} cy={last.y} r={50 + burst * 700} fill="none" stroke={LIME} strokeWidth={10 * (1 - burst) + 1} opacity={1 - burst} />
          {Array.from({ length: 12 }, (_, j) => {
            const a = (j / 12) * Math.PI * 2, r0 = 70 + burst * 260, r1 = r0 + 40 + burst * 120;
            return <line key={j} x1={last.x + Math.cos(a) * r0} y1={last.y + Math.sin(a) * r0} x2={last.x + Math.cos(a) * r1} y2={last.y + Math.sin(a) * r1} stroke={INK} strokeWidth={5} opacity={1 - burst} />;
          })}
          <circle cx={last.x} cy={last.y} r={disc * 2400} fill={LIME} />
        </svg>
      )}
    </Field>
  );
};

/* Leaderboard (lime): the weekly top list; the leader's row is the signal; diagonal ink slabs wipe to ink (device 7). */
const ROWS = [['נועה', 7], ['דניאל', 6], ['מאיה', 6], ['יוסי', 5], ['תמר', 4]] as const;
const Board: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Field k="lime">
      <Overline f={f} at={1} label="טבלת המובילים" n="שבועי" color={MUTED} top={430} />
      <div style={{ position: 'absolute', top: 520, left: 60, right: 90 }}>
        <Letters text="מי מוביל?" f={f} at={2} style={impactStyle(fit('מי מוביל?', 220), INK)} />
      </div>
      <div style={{ position: 'absolute', top: 820, left: 90, right: 90, display: 'grid', gap: 14 }}>
        {ROWS.map(([name, s], i) => {
          const x = (q: number) => snap(q, 8 + i * 3, -700, 0, 8);
          const v = Math.abs(x(f) - x(f - 1));
          const lead = i === 0;
          const bar = snap(f, 16 + i * 3, 0, Number(s) / 10, 24);
          return (
            <Blur key={i} x={v * 0.6}>
              <div style={{ transform: `translateX(${x(f)}px)`, opacity: f < 8 + i * 3 ? 0 : 1, height: 112, borderRadius: 28, background: lead ? INK : 'rgba(17,19,15,.07)',
                display: 'flex', alignItems: 'center', gap: 26, padding: '0 34px', direction: 'rtl' }}>
                <span style={{ fontFamily: mono, fontSize: 30, color: lead ? LIME : MUTED, width: 44 }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ ...impactStyle(58, lead ? PAPER : INK), width: 230 }}>{name}</span>
                <span style={{ flex: 1, height: 14, borderRadius: 7, background: lead ? '#2A2E24' : 'rgba(17,19,15,.1)', overflow: 'hidden', display: 'flex' }}>
                  <span style={{ width: `${bar * 100}%`, background: lead ? LIME : INK, borderRadius: 7 }} />
                </span>
                <span style={{ fontFamily: mono, fontSize: 30, color: lead ? PAPER : INK, width: 70, textAlign: 'left', direction: 'ltr' }}>{s}/10</span>
              </div>
            </Blur>
          );
        })}
      </div>
      <div style={{ position: 'absolute', top: 1490, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Decode f={f} at={2 * BEAT + 6} text="טופ 10 בסטורי כל שבוע · שמות לדוגמה" style={monoStyle(26, MUTED)} />
      </div>
      {f >= 47 && [0, 1, 2].map((j) => {
        const p = accel(f, 47 + j * 2, 0, 1, 9);
        return <div key={j} style={{ position: 'absolute', left: -1400 + p * 2600 - j * 260, top: -400, width: 900, height: H + 800, background: j === 1 ? PAPER : INK, transform: 'rotate(-20deg)', transformOrigin: '50% 50%' }} />;
      })}
      {f >= 55 && <AbsoluteFill style={{ background: INK, opacity: lin(f, 55, 0, 1, 3) }} />}
    </Field>
  );
};

/* Prize (ink): the numbered golden card; its dot opens into portal rings to lime (device 11). */
const Prize: React.FC = () => {
  const f = useCurrentFrame();
  const inY = (x: number) => snap(x, 4, 600, 0, 10);
  const v = Math.abs(inY(f) - inY(f - 1));
  const tilt = drift(f, 14, -4, -2, 40);
  const shine = lin(f, 16, -0.4, 1.4, 26);
  const dot = { x: 292, y: 1186 }; // the wordmark disc on the card
  const rings = accel(f, 46, 0, 1, 14);
  return (
    <Field k="ink">
      <Overline f={f} at={1} label="הפרס" n="0001" color={C.onInk} top={430} />
      <div style={{ position: 'absolute', top: 500, left: 60, right: 90 }}>
        <Letters text="מי שמשלים ראשון" f={f} at={2} style={impactStyle(fit('מי שמשלים ראשון', 150), PAPER)} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}><WriteOn g={f} at={BEAT + 2} style={accentStyle(110, PAPER)}>זוכה.</WriteOn></div>
      </div>
      <div style={{ position: 'absolute', left: 540 - 400, top: 1000 - 250, width: 800, height: 500, transform: `translateY(${inY(f)}px) rotate(${tilt}deg)` }}>
        <Blur y={v * 0.7}>
          <div style={{ position: 'relative', width: 800, height: 500, borderRadius: 44, background: `linear-gradient(135deg, #E6FF7A 0%, ${LIME} 45%, ${C.lime2} 100%)`, overflow: 'hidden', boxShadow: '0 60px 120px -40px rgba(215,255,53,.35)' }}>
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(105deg, transparent ${shine * 100 - 12}%, rgba(255,255,240,.65) ${shine * 100}%, transparent ${shine * 100 + 12}%)` }} />
            <div style={{ position: 'absolute', top: 44, right: 50, textAlign: 'right' }}>
              <div style={{ ...monoStyle(24, MUTED) }}>כרטיס זהב · מייסדי פרקו</div>
              <div style={{ ...impactStyle(72, INK), marginTop: 6 }}>כרטיס הזהב</div>
            </div>
            <div style={{ position: 'absolute', bottom: 40, right: 50, fontFamily: mono, fontSize: 120, color: INK, letterSpacing: '0.06em', direction: 'ltr', lineHeight: 1 }}>0001</div>
            <div style={{ position: 'absolute', bottom: 48, left: 50 }}><Wordmark size={50} color={INK} disc={INK} /></div>
          </div>
        </Blur>
      </div>
      <div style={{ position: 'absolute', top: 1340, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Decode f={f} at={BEAT + 4} text="ממוספר · והשם שלכם בעמוד המייסדים" style={monoStyle(28, C.onInk)} />
      </div>
      {f >= 44 && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {[0, 1, 2, 3].map((j) => {
            const r = Math.max(0, rings * 2600 - j * 280);
            return <circle key={j} cx={dot.x} cy={dot.y} r={r} fill={j % 2 ? '#1F221B' : j === 3 ? LIME : '#2A2E24'} />;
          })}
          <circle cx={dot.x} cy={dot.y} r={Math.max(0, rings * 2600 - 3 * 280)} fill={LIME} />
        </svg>
      )}
    </Field>
  );
};

/* Call to action (lime): comment now; the comment's send dot grows into the ink mask (device 2). */
const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const push = drift(f, 0, 1, 1.025, 44);
  const pill = snap(f, 6, 0, 1, 9);
  const mask = accel(f, 46, 1, 70, 14);
  return (
    <Field k="lime">
      <div style={{ position: 'absolute', top: 560, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${push})` }}>
        <Letters text="תגיבו עכשיו" f={f} at={1} style={impactStyle(fit('תגיבו עכשיו', 200), INK)} />
        <div style={{ marginTop: 70, height: 170, borderRadius: 85, background: INK, display: 'flex', alignItems: 'center', gap: 34, padding: '0 34px 0 60px', direction: 'rtl', transform: `scaleX(${pill})`, transformOrigin: '100% 50%' }}>
          <span style={{ ...impactStyle(92, PAPER), opacity: pill > 0.6 ? 1 : 0 }}>אני בפנים</span>
          <span style={{ width: 96, height: 96, borderRadius: '50%', background: f >= 46 ? INK : LIME, display: 'inline-block', transform: `scale(${mask})`, flex: 'none', position: 'relative', zIndex: 2 }} />
        </div>
        <div style={{ marginTop: 50, width: 900, display: 'flex', justifyContent: 'flex-end' }}><WriteOn g={f} at={BEAT + 2} style={accentStyle(96, INK)}>והמרוץ שלכם מתחיל.</WriteOn></div>
      </div>
    </Field>
  );
};

/* End (ink): the lime dot travels and writes the wordmark, then becomes its "o" (device 12). */
const End: React.FC = () => {
  const f = useCurrentFrame();
  const p = snap(f, 4, 0, 1, 20);
  const landed = f >= 24;
  return (
    <Field k="ink">
      <div style={{ position: 'absolute', top: 700, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', fontSize: 200 }}>
          <Wordmark size={200} color={PAPER} disc={LIME} reveal={p} hideDisc={!landed} />
          {!landed && f >= 4 && (
            <Blur x={Math.abs(snap(f, 4, 0, 1, 20) - snap(f - 1, 4, 0, 1, 20)) * 400}>
              <span style={{ position: 'absolute', top: '0.47em', left: `calc(${p * 100}% - 0.5em)`, width: '0.5em', height: '0.5em', borderRadius: '50%', background: LIME, boxShadow: '0 0 60px 20px rgba(215,255,53,.35)' }} />
            </Blur>
          )}
        </div>
        <div style={{ marginTop: 60, width: 900, display: 'flex', justifyContent: 'flex-end' }}><WriteOn g={f} at={28} style={accentStyle(70, PAPER)}>המרוץ לכרטיס הזהב.</WriteOn></div>
        <div style={{ marginTop: 40, width: lin(f, 36, 0, 700, 8), height: 1, background: 'rgba(248,248,244,.4)' }} />
        <div style={{ marginTop: 34 }}><Decode f={f} at={40} text="כל הפרטים והתקנון בקישור בביו" style={monoStyle(30, C.onInk)} /></div>
      </div>
    </Field>
  );
};

const HUD: HudScene[] = [
  { from: R(2), to: R(3), tag: 'שלב 1 / תגובה', dark: false },
  { from: R(3), to: R(4), tag: 'שלב 2 / הודעה פרטית', dark: true },
  { from: R(4), to: R(5), tag: 'שלב 3 / חותמות', dark: false },
  { from: R(5), to: R(6), tag: 'טבלה / שבועית', dark: false },
  { from: R(6), to: R(7), tag: 'פרס / 0001', dark: true },
  { from: R(7), to: R(8), tag: 'קריאה לפעולה', dark: false },
];

export const PerkoReelRace: React.FC = () => (
  <AbsoluteFill style={{ background: INK }}>
    <Sequence from={0} durationInFrames={BAR}><Boot /></Sequence>
    <Sequence from={R(1)} durationInFrames={BAR}><Title /></Sequence>
    <Sequence from={R(2)} durationInFrames={BAR}><Comment /></Sequence>
    <Sequence from={R(3)} durationInFrames={BAR}><Dm /></Sequence>
    <Sequence from={R(4)} durationInFrames={BAR}><Stamps /></Sequence>
    <Sequence from={R(5)} durationInFrames={BAR}><Board /></Sequence>
    <Sequence from={R(6)} durationInFrames={BAR}><Prize /></Sequence>
    <Sequence from={R(7)} durationInFrames={BAR}><Cta /></Sequence>
    <Sequence from={R(8)} durationInFrames={RACE_FRAMES - R(8)}><End /></Sequence>
    <Sequence from={R(2) - 3} durationInFrames={14}><Flash /></Sequence>
    <Hud916 scenes={HUD} label="פרקו - המרוץ 2026" />
  </AbsoluteFill>
);
