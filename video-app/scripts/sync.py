#!/usr/bin/env python3
"""Send the daily reels to Perko Studio (the calendar site): specs, times and the rendered video + cover.

  REELS_ADMIN_TOKEN=... python3 scripts/sync.py            # new reels get their time from schedule.json; files upload
  REELS_ADMIN_TOKEN=... python3 scripts/sync.py --reschedule   # also reset unpublished reels to schedule.json times

Times moved in the Studio are kept unless --reschedule is given. Published reels are never touched.
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
    p = argparse.ArgumentParser(); p.add_argument('--reschedule', action='store_true'); p.add_argument('--no-upload', action='store_true')
    a = p.parse_args()
    if not os.environ.get('REELS_ADMIN_TOKEN'):
        sys.exit('REELS_ADMIN_TOKEN is not set')
    reels, upload = [], []
    for sid, at in schedule():
        reels.append({'id': sid, 'spec': json.loads((SPECS / f'{sid}.json').read_text()), 'scheduled_at': at.isoformat()})
        if not a.no_upload and (RENDERS / f'{sid}.mp4').exists() and (RENDERS / f'{sid}-cover.jpg').exists():
            upload.append(sid)
    res = call('/admin/sync', {'reels': reels, 'reschedule': a.reschedule, 'upload': upload})['reels']
    for sid in [r['id'] for r in reels]:
        r = res[sid]
        if 'video_upload' in r:
            put(r['video_upload'], RENDERS / f'{sid}.mp4', 'video/mp4')
            put(r['cover_upload'], RENDERS / f'{sid}-cover.jpg', 'image/jpeg')
            call('/admin/uploaded', {'id': sid})
        print(f"{sid}  {r['status']:<10} {r['scheduled_at']}  {'uploaded' if 'video_upload' in r else ''}")


if __name__ == '__main__':
    main()
