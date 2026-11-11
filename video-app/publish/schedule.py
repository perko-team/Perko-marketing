#!/usr/bin/env python3
"""Build the calendar rows for a week of daily reels (the dashboard's `reels` collection).

  python3 publish/schedule.py --first-day 01 --start 2026-11-12 [--assets assets.json] > rows.json

Slot a posts at 12:30, slot b at 19:30, Israel time (Asia/Jerusalem); day NN posts on start + (NN - first-day).
--assets maps a file name (day01-a.mp4, day01-a-cover.jpg) to its uploaded URL.
Each row: id, day, slot, date, time, status, title, format, caption (with hashtags), caption_original, video, cover, duration.
"""
import argparse, datetime as dt, json, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SLOTS = {'a': '12:30', 'b': '19:30'}


def duration(mp4):
    if not mp4.exists():
        return None
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(mp4)],
                         capture_output=True, text=True)
    return round(float(out.stdout.strip()), 2) if out.returncode == 0 and out.stdout.strip() else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--first-day', type=int, default=1)
    ap.add_argument('--days', type=int, default=7)
    ap.add_argument('--start', required=True, help='posting date of the first day, YYYY-MM-DD')
    ap.add_argument('--assets', type=pathlib.Path)
    a = ap.parse_args()
    assets = json.loads(a.assets.read_text()) if a.assets else {}
    start = dt.date.fromisoformat(a.start)
    rows = []
    for n in range(a.first_day, a.first_day + a.days):
        for slot, time in SLOTS.items():
            rid = f'day{n:02d}-{slot}'
            spec = json.loads((ROOT / 'content' / 'daily' / f'{rid}.json').read_text())
            caption = spec['caption'].strip() + '\n\n' + ' '.join(spec.get('hashtags', []))
            rows.append({
                'id': rid, 'day': n, 'slot': slot,
                'date': (start + dt.timedelta(days=n - a.first_day)).isoformat(), 'time': time,
                'status': 'scheduled',
                'title': f"{spec['hook']} {spec.get('hookAccent', '')}".strip(),
                'format': spec['format'],
                'caption': caption, 'caption_original': caption,
                'video': assets.get(f'{rid}.mp4'), 'cover': assets.get(f'{rid}-cover.jpg'),
                'duration': duration(ROOT / 'out' / 'daily' / f'{rid}.mp4'),
            })
    json.dump(rows, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
