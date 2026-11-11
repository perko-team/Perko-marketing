#!/usr/bin/env python3
"""Publish a daily reel to Instagram as a Reel through the Graph API (Facebook Login token, system user).

Three modes, safest first:
  check    (default)  validates the token, finds the IG account, checks the video and caption. Sends nothing.
  stage               also creates a REELS container and uploads the video. Nothing is published;
                      an unpublished container expires on its own after 24 hours.
  publish             stage + media_publish. Posts to the account. Needs --yes.

Usage:
  python3 publish/ig_publish.py out/daily/day01-a.mp4 content/daily/day01-a.json
  python3 publish/ig_publish.py out/daily/day01-a.mp4 content/daily/day01-a.json --mode stage
  python3 publish/ig_publish.py out/daily/day01-a.mp4 content/daily/day01-a.json --mode publish --yes
  python3 publish/ig_publish.py --account          # only the token + account check

Env:
  IG_ACCESS_TOKEN   system user token with instagram_basic + instagram_content_publish (required)
  IG_USER_ID        Instagram business account id (17841...). Optional: found through the token's Pages if missing.

The token is never printed. The video is sent as bytes (resumable upload), so it needs no public URL.
"""
import argparse, json, os, pathlib, subprocess, sys, time

import requests

API = 'v21.0'
GRAPH = f'https://graph.facebook.com/{API}'
RUPLOAD = f'https://rupload.facebook.com/ig-api-upload/{API}'

# Instagram's Reels limits (content publishing API)
MAX_BYTES = 300 * 1024 * 1024
MIN_SEC, MAX_SEC = 3, 15 * 60
MAX_CAPTION = 2200
MAX_HASHTAGS = 30


class Fail(Exception):
    pass


def token():
    t = os.environ.get('IG_ACCESS_TOKEN', '').strip()
    if not t:
        raise Fail('IG_ACCESS_TOKEN is not set')
    return t


def graph(method, path, **params):
    params['access_token'] = token()
    r = requests.request(method, f'{GRAPH}/{path}', params=params if method == 'GET' else None,
                         data=params if method != 'GET' else None, timeout=60)
    try:
        body = r.json()
    except ValueError:
        raise Fail(f'{method} {path}: HTTP {r.status_code}, not JSON')
    if 'error' in body:
        e = body['error']
        raise Fail(f"{method} {path}: {e.get('message')} (code {e.get('code')}, subcode {e.get('error_subcode')})")
    return body


def find_account():
    """Returns (ig_user_id, username). Raises Fail with what to fix when there is none."""
    me = graph('GET', 'me', fields='id,name')
    print(f"token ok: {me.get('name')} ({me.get('id')})")
    perms = {p['permission'] for p in graph('GET', 'me/permissions')['data'] if p['status'] == 'granted'}
    missing = {'instagram_basic', 'instagram_content_publish'} - perms
    if missing:
        raise Fail(f'token is missing permissions: {", ".join(sorted(missing))}')

    ig = os.environ.get('IG_USER_ID', '').strip()
    if not ig:
        pages = graph('GET', 'me/accounts', fields='id,name,instagram_business_account')['data']
        linked = [p for p in pages if p.get('instagram_business_account')]
        if not linked:
            raise Fail('no Instagram account reachable: the token sees no Facebook Page with a linked Instagram '
                       'business account. In Business Settings, assign the Perko Page and the Instagram account '
                       'to the system user (and grant pages_show_list, business_management), or set IG_USER_ID.')
        if len(linked) > 1:
            names = ', '.join(f"{p['name']} -> {p['instagram_business_account']['id']}" for p in linked)
            raise Fail(f'several Instagram accounts, set IG_USER_ID to one of: {names}')
        ig = linked[0]['instagram_business_account']['id']

    acc = graph('GET', ig, fields='id,username,media_count')
    quota = graph('GET', f'{ig}/content_publishing_limit', fields='quota_usage,config')['data']
    used = quota[0].get('quota_usage', '?') if quota else '?'
    limit = quota[0].get('config', {}).get('quota_total', '?') if quota else '?'
    print(f"account ok: @{acc.get('username')} ({acc['id']}), {acc.get('media_count')} posts, "
          f'published in the last 24 h: {used}/{limit}')
    return acc['id'], acc.get('username')


def probe(video):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
                          'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt',
                          '-of', 'json', str(video)], capture_output=True, text=True, check=True)
    info = json.loads(out.stdout)
    v = next((s for s in info['streams'] if s['codec_type'] == 'video'), None)
    a = next((s for s in info['streams'] if s['codec_type'] == 'audio'), None)
    return v, a, float(info['format']['duration'])


def check_video(video):
    problems = []
    size = video.stat().st_size
    v, a, dur = probe(video)
    if size > MAX_BYTES: problems.append(f'file is {size / 1e6:.0f} MB, the limit is 300 MB')
    if not v: problems.append('no video stream')
    else:
        if v['codec_name'] not in ('h264', 'hevc'): problems.append(f"video codec {v['codec_name']}, needs H.264 or HEVC")
        if v.get('pix_fmt') not in ('yuv420p', 'yuvj420p'): problems.append(f"pixel format {v.get('pix_fmt')}, needs yuv420p")
        if abs(v['width'] / v['height'] - 9 / 16) > 0.01: problems.append(f"{v['width']}x{v['height']} is not 9:16")
        num, den = map(int, v['r_frame_rate'].split('/'))
        if not 23 <= num / den <= 60: problems.append(f'{num / den:.1f} fps, needs 23-60')
    if a and a['codec_name'] != 'aac': problems.append(f"audio codec {a['codec_name']}, needs AAC")
    if not MIN_SEC <= dur <= MAX_SEC: problems.append(f'{dur:.1f} s, needs {MIN_SEC}-{MAX_SEC} s')
    desc = f"{v['width']}x{v['height']} {v['codec_name']}" if v else 'no video'
    print(f"video: {video.name}, {desc}, {'AAC audio' if a and a['codec_name'] == 'aac' else 'audio: ' + (a['codec_name'] if a else 'none')}, "
          f'{dur:.1f} s, {size / 1e6:.1f} MB')
    return problems


def build_caption(spec):
    tags = spec.get('hashtags', [])
    text = spec.get('caption', '').strip()
    return f"{text}\n\n{' '.join(tags)}".strip() if tags else text


def check_caption(caption):
    problems = []
    if len(caption) > MAX_CAPTION: problems.append(f'caption is {len(caption)} characters, the limit is {MAX_CAPTION}')
    n = caption.count('#')
    if n > MAX_HASHTAGS: problems.append(f'{n} hashtags, the limit is {MAX_HASHTAGS}')
    if not caption: problems.append('empty caption')
    print(f'caption: {len(caption)} characters, {n} hashtags')
    return problems


def stage(ig, video, caption, cover_ms):
    c = graph('POST', f'{ig}/media', media_type='REELS', upload_type='resumable', caption=caption,
              share_to_feed='true', thumb_offset=str(cover_ms))
    cid = c['id']
    print(f'container created: {cid}')
    data = video.read_bytes()
    r = requests.post(f'{RUPLOAD}/{cid}', data=data, timeout=600, headers={
        'Authorization': f'OAuth {token()}', 'offset': '0', 'file_size': str(len(data))})
    if r.status_code != 200 or not r.json().get('success'):
        raise Fail(f'upload failed: HTTP {r.status_code} {r.text[:300]}')
    print('video uploaded, waiting for Instagram to process it')
    for _ in range(60):
        s = graph('GET', cid, fields='status_code,status')
        code = s.get('status_code')
        if code == 'FINISHED':
            print('container ready')
            return cid
        if code in ('ERROR', 'EXPIRED'):
            raise Fail(f"container {code}: {s.get('status')}")
        time.sleep(5)
    raise Fail('container still processing after 5 minutes')


def publish(ig, cid):
    m = graph('POST', f'{ig}/media_publish', creation_id=cid)
    link = graph('GET', m['id'], fields='permalink').get('permalink')
    print(f"PUBLISHED: media {m['id']} {link or ''}")
    return m['id'], link


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video', nargs='?', type=pathlib.Path)
    ap.add_argument('spec', nargs='?', type=pathlib.Path, help='the reel JSON (caption, hashtags)')
    ap.add_argument('--mode', choices=('check', 'stage', 'publish'), default='check')
    ap.add_argument('--caption', help='override the caption (full text, hashtags included)')
    ap.add_argument('--cover-ms', type=int, default=1333, help='cover frame offset in ms (frame 40 at 30 fps)')
    ap.add_argument('--account', action='store_true', help='only check the token and the account')
    ap.add_argument('--yes', action='store_true', help='required with --mode publish')
    ap.add_argument('--json', action='store_true', help='print a JSON result line at the end')
    a = ap.parse_args()

    result = {'mode': a.mode, 'ok': False}
    try:
        if a.account:
            result['ig_user_id'], result['username'] = find_account()
            result['ok'] = True
            return 0
        if not a.video or not a.spec:
            ap.error('video and spec are required')
        if a.mode == 'publish' and not a.yes:
            raise Fail('--mode publish posts to Instagram; add --yes to confirm')
        spec = json.loads(a.spec.read_text())
        caption = a.caption if a.caption is not None else build_caption(spec)
        problems = check_video(a.video) + check_caption(caption)
        try:
            ig, _ = find_account()
        except Fail as e:
            if a.mode != 'check': raise
            ig = None; problems.append(str(e))
        if problems:
            raise Fail('not ready:\n  - ' + '\n  - '.join(problems))
        if a.mode == 'check':
            print('CHECK OK: ready to publish, nothing was sent')
        else:
            cid = stage(ig, a.video, caption, a.cover_ms)
            result['container_id'] = cid
            if a.mode == 'stage':
                print('STAGE OK: uploaded, not published (the container expires in 24 h)')
            else:
                result['media_id'], result['permalink'] = publish(ig, cid)
        result['ok'] = True
        return 0
    except Fail as e:
        result['error'] = str(e)
        print(f'FAIL: {e}', file=sys.stderr)
        return 1
    finally:
        if a.json:
            print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    sys.exit(main())
