"""Four original loops for the daily reels, synthesised from scratch (numpy/scipy, no samples). 120 BPM, 4/4, 24 s each,
so every daily reel (up to about 15.5 s) has music to the end. Each loop has its own key, groove and lead.

Run:  python3 music/daily.py  ->  public/daily/music-{1..4}.wav (48 kHz, stereo, 16-bit)
"""
import numpy as np, wave, pathlib
from scipy.signal import butter, sosfilt

SR = 48000
BEAT = 0.5
DUR = 24.0
N = int(DUR * SR)
OUT = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'daily'
OUT.mkdir(parents=True, exist_ok=True)


def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)
def t_of(n): return np.arange(n) / SR
def hz(m): return 440 * 2 ** ((m - 69) / 12)


def adsr(n, a=0.005, d=0.15, s=0.0, r=0.05):
    t = t_of(n); e = np.ones(n)
    e = np.where(t < a, t / a, e)
    dd = (t >= a) & (t < a + d); e = np.where(dd, 1 - (1 - s) * (t - a) / d, e)
    e = np.where(t >= a + d, s if s else 0.0, e) if s else np.where(t >= a + d, 0.0, e)
    tail = int(r * SR)
    if tail and n > tail: e[-tail:] *= np.linspace(1, 0, tail)
    return e


class Mix:
    def __init__(self): self.L = np.zeros(N); self.R = np.zeros(N)
    def add(self, sig, at, g=1.0, pan=0.0):
        i = int(at * SR)
        if i >= N: return
        sig = sig[: N - i]; a = (pan + 1) * np.pi / 4
        self.L[i:i + len(sig)] += sig * g * np.cos(a); self.R[i:i + len(sig)] += sig * g * np.sin(a)


def kick(): n = int(0.35 * SR); t = t_of(n); f = 50 + 90 * np.exp(-t * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
def snare(rng): n = int(0.22 * SR); t = t_of(n); return hp(rng.standard_normal(n), 1500) * np.exp(-t * 22) * 0.6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.4
def hat(rng, open_=False): n = int((0.18 if open_ else 0.05) * SR); t = t_of(n); return hp(rng.standard_normal(n), 7000) * np.exp(-t * (14 if open_ else 70))
def clap(rng):
    n = int(0.25 * SR); t = t_of(n); x = np.zeros(n)
    for k in range(3): s = int(k * 0.012 * SR); x[s:] += hp(rng.standard_normal(n - s), 1200) * np.exp(-t[: n - s] * 35)
    return x * 0.5
def bass(m, dur): n = int(dur * SR); t = t_of(n); f = hz(m); x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t); return lp(x, 900) * adsr(n, 0.004, dur * 0.8, 0.0, 0.03)
def pluck(m, dur): n = int(dur * SR); t = t_of(n); f = hz(m); x = sum(np.sin(2 * np.pi * f * h * t) / h ** 1.6 for h in range(1, 6)); return x * np.exp(-t * 6)
def pad(ms, dur):
    n = int(dur * SR); t = t_of(n); x = np.zeros(n)
    for m in ms:
        for det in (-0.08, 0.08): x += np.sign(np.sin(2 * np.pi * hz(m + det) * t)) * 0.15
    return lp(x, 1400) * np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 0.3)
def bell(m, dur=1.2): n = int(dur * SR); t = t_of(n); f = hz(m); return (np.sin(2 * np.pi * f * t + 1.5 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t * 4))) * np.exp(-t * 3.5)


# key root (midi), chord progression (semitones from root, minor/major triads), lead motif (scale steps), groove flavour
LOOPS = [
    dict(root=55, prog=[[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]], lead=[12, 14, 16, 19], swing=0.0, seed=1),  # G, bright
    dict(root=57, prog=[[0, 3, 7], [5, 8, 12], [-2, 2, 5], [3, 7, 10]], lead=[12, 15, 17, 19], swing=0.06, seed=2),  # A minor, cool
    dict(root=53, prog=[[0, 4, 7], [7, 11, 14], [-3, 0, 4], [5, 9, 12]], lead=[16, 14, 12, 11], swing=0.0, seed=3),  # F, warm
    dict(root=50, prog=[[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], lead=[12, 10, 15, 17], swing=0.08, seed=4),  # D minor, night
]

for li, L in enumerate(LOOPS, 1):
    rng = np.random.default_rng(L['seed'])
    mx = Mix()
    bars = int(DUR / (4 * BEAT))
    for b in range(bars):
        t0 = b * 4 * BEAT
        ch = [L['root'] + 12 + c for c in L['prog'][b % 4]]
        intro = b == 0
        mx.add(pad(ch, 4 * BEAT), t0, 0.22)
        for k in range(4):
            bt = t0 + k * BEAT
            if not intro: mx.add(kick(), bt, 0.9)
            if not intro and k in (1, 3): mx.add(clap(rng) if li % 2 else snare(rng), bt, 0.45, 0.05)
            for e in (0, 1):
                ht = bt + e * BEAT / 2 + (L['swing'] if e else 0)
                mx.add(hat(rng, open_=(e == 1 and k == 3)), ht, 0.16 if e else 0.1, 0.3)
            if not intro:
                bn = L['root'] - 12 + L['prog'][b % 4][0]
                mx.add(bass(bn, BEAT * 0.45), bt, 0.55)
                mx.add(bass(bn + (12 if k % 2 else 0), BEAT * 0.4), bt + BEAT / 2, 0.35)
        if b % 2 == 1:  # a short motif every two bars
            for j, s in enumerate(L['lead']):
                mx.add(pluck(L['root'] + s, 0.5), t0 + j * BEAT * 0.5 + 2 * BEAT, 0.22, -0.25)
        else:
            mx.add(pluck(ch[-1] + 12, 0.6), t0 + 3.5 * BEAT, 0.12, 0.25)
    mx.add(bell(L['root'] + 24), 0.0, 0.25)
    # master: gentle glue + fade out
    Lm, Rm = mx.L, mx.R
    peak = max(np.abs(Lm).max(), np.abs(Rm).max())
    Lm, Rm = np.tanh(Lm / peak * 1.4) * 0.8, np.tanh(Rm / peak * 1.4) * 0.8
    fade = np.ones(N); fade[-int(1.5 * SR):] = np.linspace(1, 0, int(1.5 * SR))
    pcm = (np.stack([Lm * fade, Rm * fade], 1) * 32767).astype('<i2')
    with wave.open(str(OUT / f'music-{li}.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('music', li, 'ok')
