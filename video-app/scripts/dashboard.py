#!/usr/bin/env python3
"""Daily reels dashboard: a calendar of the schedule with each reel's cover, status, caption and hashtags.

  python3 scripts/dashboard.py  ->  out/daily/dashboard.html (one self-contained file, covers embedded)

Reads content/daily/*.json, schedule.json, published.json and whatever scripts/daily.sh has rendered.
"""
import base64, datetime as dt, html, io, json, pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from publish import RENDERS, SPECS, caption_of, load_log, schedule  # noqa: E402

FORMAT = {'tips': 'טיפים', 'myth': 'מיתוס או אמת', 'pov': 'POV', 'flags': 'דגלים'}
STATUS = {'published': 'פורסם', 'ready': 'מוכן לפרסום', 'missing': 'לא רונדר', 'late': 'עבר הזמן'}
DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
OUT = RENDERS / 'dashboard.html'


def thumb(sid):
    p = RENDERS / f'{sid}-cover.jpg'
    if not p.exists():
        return ''
    try:
        from PIL import Image
        im = Image.open(p).convert('RGB')
        im.thumbnail((270, 480))
        buf = io.BytesIO(); im.save(buf, 'JPEG', quality=78)
        data = buf.getvalue()
    except ImportError:
        data = p.read_bytes()
    return 'data:image/jpeg;base64,' + base64.b64encode(data).decode()


def esc(s):
    return html.escape(str(s), quote=True)


def main():
    log = load_log()
    now = dt.datetime.now(dt.timezone.utc)
    rows = []
    for sid, at in schedule():
        spec = json.loads((SPECS / f'{sid}.json').read_text())
        if sid in log:
            st = 'published'
        elif not (RENDERS / f'{sid}.mp4').exists():
            st = 'missing'
        elif at <= now:
            st = 'late'
        else:
            st = 'ready'
        rows.append(dict(sid=sid, at=at, spec=spec, st=st, img=thumb(sid), link=log.get(sid, {}).get('permalink')))
    if not rows:
        sys.exit('no schedule')

    counts = {k: sum(r['st'] == k for r in rows) for k in STATUS}
    nxt = next((r for r in rows if r['st'] in ('ready', 'missing', 'late')), None)
    tz = rows[0]['at'].tzinfo
    first = rows[0]['at'].date(); last = rows[-1]['at'].date()
    start = first - dt.timedelta(days=(first.weekday() + 1) % 7)  # weeks start on Sunday
    by_day = {}
    for r in rows:
        by_day.setdefault(r['at'].date(), []).append(r)

    def card(r):
        s = r['spec']
        img = f'<img src="{r["img"]}" alt="">' if r['img'] else '<div class="noimg">אין כיסוי</div>'
        caption = caption_of(s)
        link = f'<a class="ig" href="{esc(r["link"])}" target="_blank" rel="noopener">לפוסט באינסטגרם</a>' if r['link'] else ''
        return f'''<details class="reel st-{r['st']}" id="{r['sid']}">
<summary>{img}<div class="meta"><span class="time">{r['at'].strftime('%H:%M')}</span><span class="fmt">{FORMAT[s['format']]}</span>
<span class="pill">{STATUS[r['st']]}</span><b class="hook">{esc(s['hook'])} <span>{esc(s['hookAccent'])}</span></b><code>{r['sid']}</code></div></summary>
<div class="body"><ol>{''.join(f"<li><b>{esc(i['title'])}</b>{(' ' + esc(i['body'])) if i.get('body') else ''}{(' · ' + ('🟢' if i.get('tag') == 'green' else '🔴')) if i.get('tag') else ''}</li>" for i in s['items'])}</ol>
<pre class="cap" dir="rtl">{esc(caption)}</pre><div class="acts"><button type="button" class="copy" data-text="{esc(caption)}">העתקת כיתוב</button>{link}</div>
<p class="cmd" dir="ltr">python3 scripts/publish.py publish {r['sid']} --yes</p></div></details>'''

    weeks, d = [], start
    while d <= last:
        cells = []
        for k in range(7):
            day = d + dt.timedelta(days=k)
            inside = first <= day <= last
            reels = by_day.get(day, [])
            off = inside and not reels
            cells.append(f'''<section class="day{' out' if not inside else ''}{' off' if off else ''}{' today' if day == now.astimezone(tz).date() else ''}">
<h3><span class="dn">{DAYS[(day.weekday() + 1) % 7]}</span> <span class="dd">{day.day}.{day.month}</span></h3>
{''.join(card(r) for r in reels)}{'<p class="rest">אין פרסום</p>' if off else ''}</section>''')
        weeks.append(f'<div class="week">{"".join(cells)}</div>')
        d += dt.timedelta(days=7)

    nxt_html = (f'<a href="#{nxt["sid"]}">{DAYS[(nxt["at"].weekday() + 1) % 7]} {nxt["at"].strftime("%d.%m %H:%M")} · {esc(nxt["spec"]["hook"])}</a>'
                if nxt else 'הכל פורסם')
    page = TEMPLATE.replace('{{WEEKS}}', '\n'.join(weeks)).replace('{{NEXT}}', nxt_html) \
        .replace('{{TOTAL}}', str(len(rows))).replace('{{RANGE}}', f'{first.day}.{first.month} - {last.day}.{last.month}') \
        .replace('{{UPDATED}}', now.astimezone(tz).strftime('%d.%m.%Y %H:%M'))
    for k, v in counts.items():
        page = page.replace('{{' + k.upper() + '}}', str(v))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(page)
    print(OUT)


TEMPLATE = '''<title>Perko Reels Calendar</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;900&family=JetBrains+Mono:wght@500&display=swap">
<style>
/* layout: a summary strip, then the schedule as Sunday-first week rows; each reel is a cover card that opens to its script and caption */
:root{--bg:#F8F8F4;--surface:#FFFFFC;--line:#D8DACE;--fg:#11130F;--muted:#4A5240;--lime:#D7FF35;--on-lime:#11130F;
--ok:#2F7D32;--warn:#B25E00;--bad:#B3261E;--display:"Heebo",system-ui,sans-serif;--mono:"JetBrains Mono",ui-monospace,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#11130F;--surface:#1F221B;--line:#33382B;--fg:#F0F1EA;--muted:#A9B09A;--ok:#7CCF7F;--warn:#F2A54A;--bad:#F2847C;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#11130F;--surface:#1F221B;--line:#33382B;--fg:#F0F1EA;--muted:#A9B09A;--ok:#7CCF7F;--warn:#F2A54A;--bad:#F2847C;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font-family:var(--display);direction:rtl;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:20px 40px}
.wrap{max-width:1280px;margin:0 auto;display:grid;gap:20px}
header{display:flex;flex-wrap:wrap;align-items:end;justify-content:space-between;gap:12px}
h1{font-size:clamp(26px,4vw,38px);font-weight:900;margin:0;letter-spacing:-.01em;display:flex;align-items:center;gap:10px}
h1 i{width:.42em;height:.42em;border-radius:50%;background:var(--lime);box-shadow:0 0 0 2px var(--fg);display:inline-block}
.sub{color:var(--muted);margin:4px 0 0}
.stats{display:flex;flex-wrap:wrap;gap:8px}
.stat{border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:8px 12px;min-width:72px;flex:1 0 auto}
.stat b{display:block;font-size:22px;font-variant-numeric:tabular-nums}.stat span{font-size:12px;color:var(--muted)}
.next{background:var(--lime);color:var(--on-lime);border-radius:12px;padding:12px 16px;font-weight:700;display:flex;flex-wrap:wrap;gap:8px}
.next a{color:inherit}
.week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}
.day{min-width:0;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:8px}
.day.out{background:transparent;border-style:dashed;opacity:.45}.day.off{opacity:.7}.day.today{outline:2px solid var(--fg)}
.day h3{margin:0;font-size:13px;font-weight:500;color:var(--muted);display:flex;justify-content:space-between}
.dd{font-family:var(--mono);font-variant-numeric:tabular-nums}.rest{margin:0;font-size:12px;color:var(--muted)}
.reel{border-radius:10px;border:1px solid var(--line);overflow:hidden;background:var(--bg)}
.reel summary{list-style:none;cursor:pointer;display:grid;gap:6px}.reel summary::-webkit-details-marker{display:none}
.reel summary:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.reel img,.noimg{width:100%;aspect-ratio:9/16;object-fit:cover;display:block;max-width:100%}
.noimg{display:grid;place-items:center;color:var(--muted);font-size:12px;background:repeating-linear-gradient(45deg,var(--line) 0 6px,transparent 6px 12px)}
.meta{padding:0 8px 8px;display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center;font-size:12px}
.time{font-family:var(--mono);font-weight:500}.fmt{color:var(--muted)}
.pill{margin-inline-start:auto;border-radius:99px;padding:1px 8px;font-size:11px;font-weight:700;border:1px solid currentColor}
.st-published .pill{color:var(--ok)}.st-ready .pill{color:var(--fg)}.st-missing .pill{color:var(--warn)}.st-late .pill{color:var(--bad)}
.st-published{border-color:var(--ok)}
.hook{flex-basis:100%;font-size:14px;line-height:1.25;font-weight:900}.hook span{font-weight:500}
code{font-family:var(--mono);font-size:10px;color:var(--muted)}
.body{padding:0 8px 10px;font-size:13px;display:grid;gap:8px}
.body ol{margin:0;padding-inline-start:18px;display:grid;gap:4px}
.cap{white-space:pre-wrap;font-family:var(--display);background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:8px;margin:0;font-size:12px}
.acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.copy{font:inherit;font-weight:700;background:var(--fg);color:var(--bg);border:0;border-radius:8px;padding:6px 10px;cursor:pointer}
.copy:focus-visible{outline:2px solid var(--lime);outline-offset:2px}.ig{color:var(--fg)}
.cmd{margin:0;font-family:var(--mono);font-size:10px;color:var(--muted);word-break:break-all}
footer{color:var(--muted);font-size:12px}
@media (max-width:900px){.week{grid-template-columns:1fr}.day.out{display:none}.day{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.day h3,.day .rest{grid-column:1/-1}}
@media (prefers-reduced-motion:no-preference){.reel{transition:transform .15s}.reel:not([open]):hover{transform:translateY(-2px)}}
</style>
<div class="wrap">
<header><div><h1><i></i>לוח רילס יומי</h1><p class="sub"><bdi dir="ltr">@getperko</bdi> · {{RANGE}} · שני רילס ביום, בלי שבת</p></div>
<div class="stats"><div class="stat"><b>{{TOTAL}}</b><span>בלוח</span></div><div class="stat"><b>{{PUBLISHED}}</b><span>פורסמו</span></div>
<div class="stat"><b>{{READY}}</b><span>מוכנים</span></div><div class="stat"><b>{{MISSING}}</b><span>לא רונדרו</span></div><div class="stat"><b>{{LATE}}</b><span>עבר הזמן</span></div></div></header>
<div class="next"><span>הבא בתור:</span> {{NEXT}}</div>
{{WEEKS}}
<footer>עודכן {{UPDATED}} · נוצר מ-video-app/scripts/dashboard.py · לחיצה על רילס פותחת את הכיתוב</footer>
</div>
<script>
document.querySelectorAll('.copy').forEach(b=>b.addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(b.dataset.text);b.textContent='הועתק'}
 catch(e){const p=b.closest('.body').querySelector('.cap');const r=document.createRange();r.selectNodeContents(p);const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='מסומן, העתיקו ידנית'}
 setTimeout(()=>b.textContent='העתקת כיתוב',1800)}));
const h=location.hash.slice(1);if(h){const d=document.getElementById(h);if(d){d.open=true;d.scrollIntoView({block:'center'})}}
</script>
'''

if __name__ == '__main__':
    main()
