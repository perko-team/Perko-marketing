#!/usr/bin/env python3
"""Split one narration take (all of a reel's lines, read in order with a pause between them) into one clip per scene,
and write the clips' lengths into the spec's "vo" field, the same shape content/voiceover.py writes.

  python3 content/vo_split.py day01-a take.mp3 --voice "ElevenLabs Gad Tamir - Casual"

Used for the ElevenLabs takes (generated from content/voiceover.py's lines(), one take per reel). The cut points are
the N-1 longest pauses, so the take must contain exactly the reel's lines in order.
"""
import argparse, json, pathlib, subprocess, sys
import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from voiceover import OUT, SPECS, lines  # noqa: E402

SR = 16000


def pcm(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<i2').astype(float) / 32768


def pauses(x, floor_db=-40, min_len=0.18):
    """[(start, end)] of the quiet stretches, in seconds"""
    hop = int(0.01 * SR)
    rms = np.sqrt(np.convolve(x ** 2, np.ones(hop) / hop, 'same')[::hop])
    quiet = 20 * np.log10(rms + 1e-9) < floor_db
    out, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            if (j - i) * 0.01 >= min_len: out.append((i * 0.01, j * 0.01))
            i = j
        else: i += 1
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument('id'); p.add_argument('take'); p.add_argument('--voice', default='ElevenLabs Gad Tamir - Casual'); p.add_argument('--tempo', type=float, default=1.1)
    a = p.parse_args()
    spec_path = SPECS / f'{a.id}.json'
    spec = json.loads(spec_path.read_text())
    n = len(lines(spec))
    x = pcm(a.take); total = len(x) / SR
    ps = [q for q in pauses(x) if 0.3 < q[0] and q[1] < total - 0.3]  # inner pauses only
    if len(ps) < n - 1:
        sys.exit(f'{a.id}: found {len(ps)} pauses, need {n - 1}; regenerate the take with clearer breaks')
    # each cut is the pause nearest to where the text says the line should end (characters are a fair clock),
    # preferring longer pauses: a sentence break inside a line is shorter than the break between lines
    L = [len(t) for t in lines(spec)]
    cum = np.cumsum(L) / sum(L)
    cuts, used = [], set()
    for k in range(n - 1):
        want = total * cum[k]
        best = min((j for j in range(len(ps)) if j not in used),
                   key=lambda j: abs((ps[j][0] + ps[j][1]) / 2 - want) - 1.5 * (ps[j][1] - ps[j][0]))
        used.add(best); cuts.append(ps[best])
    cuts.sort()
    bounds = [0.0] + [(s + e) / 2 for s, e in cuts] + [total]
    OUT.mkdir(parents=True, exist_ok=True)
    scenes = []
    for i in range(n):
        seg = x[int(bounds[i] * SR): int(bounds[i + 1] * SR)]
        loud = np.where(np.abs(seg) > 10 ** (-40 / 20))[0]
        t0 = bounds[i] + max(0, loud[0] / SR - 0.03); t1 = bounds[i] + min(len(seg) / SR, loud[-1] / SR + 0.08)
        name = f'{a.id}-el-{i}.mp3'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t0:.3f}', '-to', f'{t1:.3f}', '-i', a.take, '-filter:a', f'atempo={a.tempo},loudnorm=I=-16:TP=-1.5:LRA=7', '-ar', '48000', '-b:a', '160k', str(OUT / name)], check=True)
        d = (t1 - t0) / a.tempo
        scenes.append({'file': name, 'dur': round(d, 2)})
        print(f'  {name} {d:4.1f}s')
    spec['vo'] = {'voice': a.voice, 'scenes': scenes}
    spec_path.write_text(json.dumps(spec, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
