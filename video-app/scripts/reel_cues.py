#!/usr/bin/env python3
"""Cue list for the sound-effects skill, from a daily reel spec (same timeline as src/daily/DailyReel.tsx).
  python3 scripts/reel_cues.py content/daily/day08-a.json > cues.json
Only for reels without narration: every scene is one bar (60 frames at 30 fps), then the 75-frame end card.
"""
import json, sys

FPS, BAR, BEAT = 30, 60, 15
s = json.load(open(sys.argv[1]))
if s.get('vo'):
    sys.exit('narrated reels have longer scenes; this cue builder covers reels without vo')
n = len(s['items'])
start = lambda i: i * BAR / FPS          # scene i: 0 hook, 1..n items, n+1 call to action
end_at = (n + 2) * BAR / FPS              # the end card (wordmark)
t = lambda f: round(f / FPS, 3)

cues = [{'t': 0.0, 'type': 'reveal', 'desc': 'hook lands on frame 0'}]
for i in range(1, n + 2):
    cues.append({'t': start(i), 'type': 'scene_cut', 'desc': f'cut to scene {i}'})
for i, it in enumerate(s['items']):
    at = start(1 + i) * FPS
    if s['format'] == 'myth':
        cues.append({'t': t(at + 34), 'type': 'error_or_tech', 'desc': 'myth stamped'} if i % 2 == 0
                    else {'t': t(at + 5), 'type': 'success', 'desc': 'fact'})
    elif s['format'] == 'flags':
        cues.append({'t': t(at + 5), 'type': 'success' if it.get('tag') == 'green' else 'error_or_tech', 'desc': f"{it.get('tag')} flag"})
    else:
        cues.append({'t': t(at + 5), 'type': 'appear', 'desc': it['title']})
cues.append({'t': t(start(n + 1) * FPS + 2 * BEAT), 'type': 'success', 'desc': 'call to action'})
cues.append({'t': end_at, 'type': 'scene_cut', 'desc': 'end card'})
cues.append({'t': t(end_at * FPS + 24), 'type': 'reveal', 'desc': 'wordmark'})
print(json.dumps(sorted(cues, key=lambda c: c['t']), ensure_ascii=False, indent=1))
