#!/usr/bin/env python3
"""Publish the daily reels to Instagram through the Graph API (stdlib only, no hosting needed).

  python3 scripts/publish.py check                 # read-only: token, account, publishing quota
  python3 scripts/publish.py publish day01-a       # dry run: shows what would be sent
  python3 scripts/publish.py publish day01-a --yes # really publishes
  python3 scripts/publish.py due [--yes]           # publishes whatever content/daily/schedule.json says is due now

Env: IG_ACCESS_TOKEN (system user token), IG_USER_ID (the Instagram professional account id).
The video goes up with a resumable upload to rupload.facebook.com, so the mp4 does not need a public URL.
Every publish is logged in content/daily/published.json, and a spec that is already there is never sent twice.
"""
import argparse, datetime as dt, json, os, pathlib, sys, time, urllib.error, urllib.parse, urllib.request
from zoneinfo import ZoneInfo

API = 'v21.0'
GRAPH = f'https://graph.facebook.com/{API}'
RUPLOAD = f'https://rupload.facebook.com/ig-api-upload/{API}'
ROOT = pathlib.Path(__file__).resolve().parent.parent
SPECS = ROOT / 'content' / 'daily'
RENDERS = ROOT / 'out' / 'daily'
LOG = SPECS / 'published.json'
SCHEDULE = SPECS / 'schedule.json'
COVER_MS = 400  # scripts/daily.sh takes the cover still at frame 12 (30 fps)


def die(msg):
    sys.exit(f'error: {msg}')


def env(name):
    v = os.environ.get(name, '').strip()
    if not v:
        die(f'{name} is not set')
    return v


def call(method, url, params=None, data=None, headers=None):
    params = dict(params or {})
    hdr = dict(headers or {})
    if 'Authorization' not in hdr:
        params['access_token'] = env('IG_ACCESS_TOKEN')
    if method == 'GET':
        url += '?' + urllib.parse.urlencode(params)
        body = None
    elif data is not None:  # raw upload
        url += ('?' + urllib.parse.urlencode(params)) if params else ''
        body = data
    else:
        body = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(url, data=body, method=method, headers=hdr)
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            return json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        try:
            err = json.loads(e.read()).get('error', {})
        except Exception:
            err = {}
        die(f"{method} {url.split('?')[0]} -> {e.code} {err.get('message', '')} (code {err.get('code')}, subcode {err.get('error_subcode')})")


def load_log():
    return json.loads(LOG.read_text()) if LOG.exists() else {}


def caption_of(spec):
    return spec['caption'].strip() + '\n\n' + ' '.join(spec['hashtags'])


def check():
    ig = env('IG_USER_ID')
    me = call('GET', f'{GRAPH}/me', {'fields': 'id,name'})
    print(f"token ok: {me.get('name')} ({me.get('id')})")
    acc = call('GET', f'{GRAPH}/{ig}', {'fields': 'username,name,media_count,followers_count'})
    print(f"account: @{acc.get('username')}  media={acc.get('media_count')}  followers={acc.get('followers_count')}")
    lim = call('GET', f'{GRAPH}/{ig}/content_publishing_limit', {'fields': 'quota_usage,config'})
    for row in lim.get('data', []):
        print(f"publishing quota: {row.get('quota_usage')}/{row.get('config', {}).get('quota_total')} in the last 24 h")
    print('nothing was published')


def publish(sid, yes):
    spec_path = SPECS / f'{sid}.json'
    video = RENDERS / f'{sid}.mp4'
    if not spec_path.exists():
        die(f'no spec {spec_path}')
    if not video.exists():
        die(f'not rendered yet: {video} (run scripts/daily.sh)')
    log = load_log()
    if sid in log:
        print(f"{sid} already published: {log[sid].get('permalink')}")
        return
    spec = json.loads(spec_path.read_text())
    cap = caption_of(spec)
    size = video.stat().st_size
    print(f'{sid}: {video.name} ({size / 1e6:.1f} MB), cover at {COVER_MS} ms\n--- caption ---\n{cap}\n---------------')
    if not yes:
        print('dry run, add --yes to publish')
        return
    ig = env('IG_USER_ID')
    c = call('POST', f'{GRAPH}/{ig}/media', {'media_type': 'REELS', 'upload_type': 'resumable', 'caption': cap,
                                             'share_to_feed': 'true', 'thumb_offset': COVER_MS})
    cid = c['id']
    print(f'container {cid}, uploading...')
    up = call('POST', f'{RUPLOAD}/{cid}', data=video.read_bytes(), headers={
        'Authorization': f"OAuth {env('IG_ACCESS_TOKEN')}", 'offset': '0', 'file_size': str(size)})
    if not up.get('success'):
        die(f'upload failed: {up}')
    for _ in range(60):  # up to 10 minutes of processing
        st = call('GET', f'{GRAPH}/{cid}', {'fields': 'status_code,status'})
        code = st.get('status_code')
        if code == 'FINISHED':
            break
        if code in ('ERROR', 'EXPIRED'):
            die(f'processing {code}: {st.get("status")}')
        time.sleep(10)
    else:
        die('processing timed out; the container can still be published later')
    mid = call('POST', f'{GRAPH}/{ig}/media_publish', {'creation_id': cid})['id']
    link = call('GET', f'{GRAPH}/{mid}', {'fields': 'permalink'}).get('permalink')
    log[sid] = {'media_id': mid, 'permalink': link, 'published_at': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')}
    LOG.write_text(json.dumps(log, ensure_ascii=False, indent=1))
    print(f'published: {link}')


def schedule():
    """[(id, aware datetime)] from schedule.json: start date, one time per slot, Saturdays optionally skipped."""
    cfg = json.loads(SCHEDULE.read_text())
    tz = ZoneInfo(cfg['timezone'])
    day = dt.date.fromisoformat(cfg['start'])
    out = []
    for n in range(1, 1 + len(list(SPECS.glob('day*-a.json')))):
        while day.weekday() in cfg.get('skip_weekdays', []):
            day += dt.timedelta(days=1)
        for slot, hhmm in cfg['slots'].items():
            sid = f'day{n:02d}-{slot}'
            if (SPECS / f'{sid}.json').exists():
                h, m = map(int, hhmm.split(':'))
                out.append((sid, dt.datetime.combine(day, dt.time(h, m), tz)))
        day += dt.timedelta(days=1)
    return out


def due(yes):
    now = dt.datetime.now(dt.timezone.utc)
    log = load_log()
    todo = [sid for sid, at in schedule() if at <= now and sid not in log]
    if not todo:
        print('nothing due')
    for sid in todo[:1] if yes else todo:  # one per run, so a missed backlog does not flood the feed
        publish(sid, yes)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)
    sub.add_parser('check')
    pp = sub.add_parser('publish'); pp.add_argument('id'); pp.add_argument('--yes', action='store_true')
    pd = sub.add_parser('due'); pd.add_argument('--yes', action='store_true')
    a = p.parse_args()
    {'check': check, 'publish': lambda: publish(a.id, a.yes), 'due': lambda: due(a.yes)}[a.cmd]()
