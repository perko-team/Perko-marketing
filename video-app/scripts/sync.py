#!/usr/bin/env python3
"""Send the daily reels to Perko Studio (the calendar site): specs, times and the rendered video + cover.

  REELS_ADMIN_TOKEN=... python3 scripts/sync.py            # new reels get their time from schedule.json; files upload
  REELS_ADMIN_TOKEN=... python3 scripts/sync.py --reschedule   # also reset unpublished reels to schedule.json times

Times moved in the Studio are kept unless --reschedule is given. Published reels are never touched.
Grid covers (out/daily/<id>-cover-lime.jpg and -ink.jpg, from scripts/grid_covers.sh) upload whenever both exist;
the server then alternates them at publish time so the profile grid reads as a checkerboard.
"""
import argparse, json, os, sys, urllib.request, pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from publish import RENDERS, SPECS, schedule  # noqa: E402

API = os.environ.get('REELS_API', 'https://fmfgpwdjmkllslzxsmyy.supabase.co/functions/v1/reels-api')


def call(path, body=None, method='POST', headers=None, data=None):
    h = {'x-reels-admin': os.environ['REELS_ADMIN_TOKEN'], 'Content-Type': 'application/json', **(headers or {})}
    req = urllib.request.Request(API + path, data=data if data is not None else json.dumps(body).encode(), method=method, headers=h)
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read() or b'{}')


def put(url, path, ctype):
    req = urllib.request.Request(url, data=path.read_bytes(), method='PUT', headers={'Content-Type': ctype, 'x-upsert': 'true'})
    with urllib.request.urlopen(req, timeout=300) as r:
        r.read()


def main():
    p = argparse.ArgumentParser(); p.add_argument('--reschedule', action='store_true'); p.add_argument('--no-upload', action='store_true'); p.add_argument('--only', nargs='*', help='upload only these reels, e.g. day01-a'); p.add_argument('--grid-only', action='store_true', help='upload only the grid covers, not the videos')
    a = p.parse_args()
    if not os.environ.get('REELS_ADMIN_TOKEN'):
        sys.exit('REELS_ADMIN_TOKEN is not set')
    reels, upload, grid = [], [], []
    for sid, at in schedule():
        reels.append({'id': sid, 'spec': json.loads((SPECS / f'{sid}.json').read_text()), 'scheduled_at': at.isoformat()})
        if not a.no_upload and not a.grid_only and (not a.only or sid in a.only) and (RENDERS / f'{sid}.mp4').exists() and (RENDERS / f'{sid}-cover.jpg').exists():
            upload.append(sid)
        if not a.no_upload and (not a.only or sid in a.only) and all((RENDERS / f'{sid}-cover-{t}.jpg').exists() for t in ('lime', 'ink')):
            grid.append(sid)
    res = call('/admin/sync', {'reels': reels, 'reschedule': a.reschedule, 'upload': upload, 'grid': grid})['reels']
    for sid in [r['id'] for r in reels]:
        r = res[sid]
        if 'video_upload' in r:
            put(r['video_upload'], RENDERS / f'{sid}.mp4', 'video/mp4')
            put(r['cover_upload'], RENDERS / f'{sid}-cover.jpg', 'image/jpeg')
        if r['status'] == 'published':
            r.pop('grid_upload', None)  # already on the grid with its old cover
        if 'grid_upload' in r:
            for t in ('lime', 'ink'):
                put(r['grid_upload'][t], RENDERS / f'{sid}-cover-{t}.jpg', 'image/jpeg')
        if 'video_upload' in r or 'grid_upload' in r:
            call('/admin/uploaded', {'id': sid, 'video': 'video_upload' in r, 'grid': 'grid_upload' in r})
        done = ' '.join(x for x, k in (('uploaded', 'video_upload'), ('grid', 'grid_upload')) if k in r)
        print(f"{sid}  {r['status']:<10} {r['scheduled_at']}  {done}")


if __name__ == '__main__':
    main()
