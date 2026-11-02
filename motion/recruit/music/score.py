"""Original score for the Perko recruitment reel (new piece, written for this edit; numpy/scipy, no samples).

120 BPM, 4/4, D major, 16.5 s. Bar = 2 s.
  0.0-4.0   intro: soft pad, muted plucks on eighths, a paper-punch clack on beat 2 (0.5 s), an air whoosh
            through the hole (1.6-2.1 s), a filtered riser, a short dip before the drop
  4.0       drop: the rings light up down the street, one bell ping per eighth for a bar
  4.0-12.0  groove: soft kick, clap, light hats, round bass, e-piano stabs, a four-note motif
  12.0      the groove stops for the end card: a low hit, a bell on the wordmark, the final chord rings out
Run: python3 music/score.py -> public/audio/score.wav (48 kHz stereo 16-bit)
"""
import wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
BPM = 120
BEAT = 60 / BPM
DUR = 16.5
N = int(DUR * SR)
rng = np.random.default_rng(23)
L = np.zeros(N)
R = np.zeros(N)


def lp(x, f, o=2):
    return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N:
        return
    s = sig[: N - i] * gain
    L[i:i + len(s)] += s * np.sqrt(0.5 * (1 - pan))
    R[i:i + len(s)] += s * np.sqrt(0.5 * (1 + pan))


def env(n, a=0.005, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def tone(m, dur, kind='sine', d=0.4, a=0.004):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(m)
    if kind == 'ep':  # e-piano: sine + soft 2nd partial with fast decay
        x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.08)
    elif kind == 'bell':
        x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.25) + 0.25 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t / 0.08)
    elif kind == 'pluck':
        x = lp(np.sign(np.sin(2 * np.pi * f * t)) * 0.5, 1800)
    else:
        x = np.sin(2 * np.pi * f * t)
    return x * env(n, a, d)


def chord(ms, dur, kind='ep', d=0.5):
    return sum(tone(m, dur, kind, d) for m in ms) / len(ms)


def kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 46 + 90 * np.exp(-t / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)


def clap():
    n = int(0.25 * SR)
    x = bp(rng.standard_normal(n), 900, 3800)
    e = np.zeros(n)
    for o in (0, 0.011, 0.022):
        i = int(o * SR)
        e[i:] += np.exp(-np.arange(n - i) / SR / 0.05)
    return x * e * 0.6


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    return hp(rng.standard_normal(n), 7000) * env(n, 0.001, 0.06 if open_ else 0.018) * 0.35


def punch():  # a paper punch: a dry wooden clack plus a short paper tear
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (180 + 300 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.035)
    tear = bp(rng.standard_normal(n), 2000, 7000) * np.exp(-t / 0.03) * 0.5
    return (body + tear) * 0.9


def whoosh(dur, f0, f1):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    seg = int(0.02 * SR)
    for i in range(0, n, seg):
        k = i / n
        f = f0 + (f1 - f0) * k
        out[i:i + seg] = bp(x[i:i + seg], max(80, f * 0.7), min(16000, f * 1.3), 1)[: len(out[i:i + seg])]
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    return out * e * 0.35


# progression in D major: D  Bm  G  A (one chord per bar), voicings around middle C
PROG = [[62, 66, 69, 73], [59, 62, 66, 69], [55, 59, 62, 66], [57, 61, 64, 69]]
ROOT = [38, 35, 31, 33]

# --- intro 0-4 s
for b in range(2):
    pad = chord([m - 12 for m in PROG[b * 2]], 2.2, 'sine', 1.4)
    add(lp(pad, 900), b * 2.0, 0.22, -0.1)
for i in range(16):  # muted plucks on eighths, building
    t0 = i * BEAT / 2
    m = PROG[0][i % 4] if t0 < 2 else PROG[1][i % 4]
    add(tone(m + 12, 0.2, 'pluck', 0.06), t0, 0.06 + 0.08 * (i / 16), 0.3 if i % 2 else -0.3)
add(punch(), 0.5, 0.8)
add(whoosh(0.55, 300, 4000), 1.6, 0.9)
add(whoosh(1.8, 200, 6000), 2.05, 0.5)  # riser into the drop
add(hp(rng.standard_normal(int(0.3 * SR)), 5000) * np.linspace(0, 1, int(0.3 * SR)) * 0.08, 3.55)

# --- drop: one bell ping per eighth while the rings light up (bar 2)
arp = [74, 78, 81, 85, 86, 85, 81, 78]
for i, m in enumerate(arp):
    add(tone(m, 0.9, 'bell', 0.35), 4.0 + i * BEAT / 2, 0.16, -0.4 + 0.8 * i / 7)

# --- groove 4-12 s (bars 2-5)
for b in range(4):
    t0 = 4.0 + b * 2.0
    c = PROG[b]
    for k in range(4):
        tb = t0 + k * BEAT
        if k in (0, 2):
            add(kick(), tb, 0.9)
        if k in (1, 3):
            add(clap(), tb, 0.55, 0.1)
        add(hat(), tb + BEAT / 2, 0.8, 0.25)
        add(hat(), tb, 0.45, -0.25)
    add(hat(True), t0 + 3.5 * BEAT, 0.6, 0.3)
    # bass: root on 1, octave on the "and" of 2, fifth on 4
    for off, m in ((0, ROOT[b]), (1.5, ROOT[b] + 12), (3, ROOT[b] + 7)):
        add(lp(tone(m, 0.45, 'sine', 0.25) + 0.3 * tone(m + 12, 0.45, 'sine', 0.12), 400), t0 + off * BEAT, 0.55)
    # e-piano stabs on the off-beats
    for off in (0.5, 2.5, 3.0):
        add(chord(c, 0.4, 'ep', 0.18), t0 + off * BEAT, 0.12, 0.2)
    # the motif, every bar: four notes rising to the chord's third
    mot = [c[0] + 12, c[1] + 12, c[2] + 12, c[1] + 12]
    for k, m in enumerate(mot):
        add(tone(m, 0.4, 'bell', 0.2), t0 + (2 + k * 0.5) * BEAT, 0.07, 0.35)

# --- the end card, 12 s: the groove stops, a low hit, the bell on the wordmark, the final chord rings
add(kick(), 12.0, 0.8)
add(lp(chord([50, 57, 62, 66, 69], 4.5, 'sine', 2.0), 2500), 12.0, 0.25)
add(tone(86, 2.5, 'bell', 0.9), 12.5, 0.18)
add(tone(81, 2.5, 'bell', 0.9), 12.75, 0.1, 0.3)

mix = np.stack([L, R], 1)
mix = hp(mix.T, 30).T
mix *= 0.89 / max(1e-6, np.max(np.abs(mix)))
fade = int(0.4 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
out = (mix * 32767).astype(np.int16)
with wave.open('public/audio/score.wav', 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(out.tobytes())
print('wrote public/audio/score.wav', DUR, 's')
