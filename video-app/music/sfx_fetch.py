"""Sound effects for the daily reels, from Mixkit (mixkit.co, "Sound Effects Free License": free for commercial use in
videos, including social media and ads, no attribution required; the raw files may not be redistributed on their own).
So the files are not committed: this script downloads them into public/daily/sfx/ (gitignored).

Run:  python3 music/sfx_fetch.py

Each role is the moment in the reel where the sound plays (see src/daily/DailyReel.tsx).
"""
import pathlib, urllib.request

OUT = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'daily' / 'sfx'
OUT.mkdir(parents=True, exist_ok=True)

# role: (mixkit id, title on mixkit.co)
SFX = {
    'hook-hit':     (772, 'Quick zoom impact'),                    # frame 0: the hook lands with a punch-in
    'whoosh-1':     (1492, 'Cinematic whoosh fast transition'),    # scene transitions, rotated
    'whoosh-2':     (3115, 'Fast transitions swoosh'),
    'whoosh-3':     (166, 'Fast small sweep transition'),
    'pop':          (2364, 'Hard pop click'),                      # an item's mark lands
    'pop-soft':     (3005, 'Explainer video pops whoosh light pop'),
    'wrong':        (950, 'Game show wrong answer buzz'),          # myth / red flag
    'right':        (947, 'Correct answer notification'),          # fact / green flag
    'strike':       (1530, 'Paper slide'),                         # the pen line through a myth
    'rise':         (2608, 'Air zoom vacuum'),                     # into the call to action
    'ding':         (586, 'Attention bell ding'),                  # the call to action lands
    'punch':        (2995, 'Stapling paper'),                      # the end card: a card being punched
}

for role, (mid, title) in SFX.items():
    dst = OUT / f'{role}.mp3'
    if dst.exists():
        continue
    url = f'https://assets.mixkit.co/active_storage/sfx/{mid}/{mid}-preview.mp3'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        dst.write_bytes(r.read())
    print(f'{role:<10} {mid:>5}  {title}')
print('sfx in', OUT)
