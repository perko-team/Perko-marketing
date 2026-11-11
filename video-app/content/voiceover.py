#!/usr/bin/env python3
"""Hebrew narration for the daily reels with Google Cloud Text-to-Speech (free tier: 1M WaveNet characters a month;
a week of reels is about 3,000).

  GOOGLE_TTS_API_KEY=... python3 content/voiceover.py --sample day01-a   # both voices for one reel, to choose
  GOOGLE_TTS_API_KEY=... python3 content/voiceover.py --voice he-IL-Wavenet-A day01 day02 ...   # or: all

The narrator says what is on screen (content/HOOKS.md: spoken and on-screen hook match), one clip per scene:
the hook, each item, the call to action. Clips go to public/daily/vo/ and their lengths into the spec's "vo" field,
which the template uses to stretch each scene to its line. Re-render with scripts/daily.sh afterwards.
"""
import argparse, base64, json, os, pathlib, re, subprocess, sys, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPECS = ROOT / 'content' / 'daily'
OUT = ROOT / 'public' / 'daily' / 'vo'
VOICES = {'he-IL-Wavenet-A': 'אישה', 'he-IL-Wavenet-B': 'גבר'}
API = 'https://texttospeech.googleapis.com/v1/text:synthesize'


def clean(t):
    return re.sub(r'\s+', ' ', t.replace('״', '').replace('"', '').replace('...', ',')).strip()


def lines(spec):
    out = [clean(f"{spec['hook']} {spec['hookAccent']}")]
    for i, it in enumerate(spec['items']):
        t, b = it['title'], it.get('body', '')
        if spec['format'] == 'myth':
            t = ('מיתוס: ' if i % 2 == 0 else 'בפועל: ') + t
        if spec['format'] == 'flags':
            b = 'דגל ירוק.' if it.get('tag') == 'green' else 'דגל אדום.'
        out.append(clean(f'{t}. {b}' if b else t))
    out.append(clean(f"{spec['cta']['big']}. {spec['cta']['accent']}."))
    return out


def tts(text, voice, rate, dst):
    body = {'input': {'text': text}, 'voice': {'languageCode': 'he-IL', 'name': voice},
            'audioConfig': {'audioEncoding': 'MP3', 'speakingRate': rate, 'sampleRateHertz': 48000}}
    req = urllib.request.Request(f"{API}?key={os.environ['GOOGLE_TTS_API_KEY']}", data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        dst.write_bytes(base64.b64decode(json.loads(r.read())['audioContent']))
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(dst)],
                                capture_output=True, text=True).stdout)


def narrate(sid, voice, rate, write=True):
    spec_path = SPECS / f'{sid}.json'
    spec = json.loads(spec_path.read_text())
    tag = voice.split('-')[-1].lower()
    scenes = []
    for i, text in enumerate(lines(spec)):
        name = f'{sid}-{tag}-{i}.mp3'
        dur = tts(text, voice, rate, OUT / name)
        scenes.append({'file': name, 'dur': round(dur, 2)})
        print(f'  {name}  {dur:4.1f}s  {text}')
    if write:
        spec['vo'] = {'voice': voice, 'scenes': scenes}
        spec_path.write_text(json.dumps(spec, ensure_ascii=False, indent=1))
    return {'voice': voice, 'scenes': scenes}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('ids', nargs='*', help='day01 (both slots), day01-a, or all')
    p.add_argument('--voice', default='he-IL-Wavenet-A', choices=list(VOICES))
    p.add_argument('--rate', type=float, default=1.08)
    p.add_argument('--sample', help='render one reel in both voices to out/daily/sample-<voice>.mp4')
    a = p.parse_args()
    if not os.environ.get('GOOGLE_TTS_API_KEY'):
        sys.exit('GOOGLE_TTS_API_KEY is not set')
    OUT.mkdir(parents=True, exist_ok=True)
    if a.sample:
        spec = json.loads((SPECS / f'{a.sample}.json').read_text())
        for v, who in VOICES.items():
            print(f'{who} ({v})')
            tmp = ROOT / 'out' / 'daily' / f'sample-{v}.json'
            tmp.parent.mkdir(parents=True, exist_ok=True)
            tmp.write_text(json.dumps({**spec, 'vo': narrate(a.sample, v, a.rate, write=False)}, ensure_ascii=False))
            subprocess.run(['npx', 'remotion', 'render', 'DailyReel', f'out/daily/sample-{v}.mp4', f'--props={tmp}',
                            '--codec', 'h264', '--crf', '20', '--log', 'error'], cwd=ROOT, check=True)
            print(f'  -> out/daily/sample-{v}.mp4')
        return
    ids = sorted(x.stem for x in SPECS.glob('day*-?.json')) if a.ids == ['all'] else \
        [x.stem for i in a.ids for x in sorted(SPECS.glob(f'{i}*.json')) if re.match(r'day\d\d-[ab]$', x.stem)]
    for sid in ids:
        print(sid)
        narrate(sid, a.voice, a.rate)


if __name__ == '__main__':
    main()
