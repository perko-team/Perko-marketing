#!/usr/bin/env python3
"""Daily reels dashboard: the schedule as a calendar of covers, a punch card of the run, and the selected reel's script,
caption and publish command.

  python3 scripts/dashboard.py  ->  out/daily/dashboard.html (one self-contained file, covers embedded)

Reads content/daily/*.json, schedule.json, published.json and whatever scripts/daily.sh has rendered.
Screen question: what goes out next, and is it ready? Every count on the screen is computed from the rows.
"""
import base64, datetime as dt, html, io, json, pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from publish import RENDERS, SPECS, caption_of, load_log, schedule  # noqa: E402

FORMAT = {'tips': 'טיפים', 'myth': 'מיתוס או אמת', 'pov': 'POV', 'flags': 'דגל אדום, דגל ירוק'}
STATUS = {'published': 'פורסם', 'ready': 'מוכן לפרסום', 'missing': 'ממתין לרינדור', 'late': 'עבר המועד'}
DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
OUT = RENDERS / 'dashboard.html'


def thumb(sid, w):
    p = RENDERS / f'{sid}-cover.jpg'
    if not p.exists():
        return ''
    try:
        from PIL import Image
        im = Image.open(p).convert('RGB')
        im.thumbnail((w, w * 16 // 9))
        buf = io.BytesIO(); im.save(buf, 'JPEG', quality=80)
        data = buf.getvalue()
    except ImportError:
        data = p.read_bytes()
    return 'data:image/jpeg;base64,' + base64.b64encode(data).decode()


def esc(s):
    return html.escape(str(s), quote=True)


def dname(d):
    return DAYS[(d.weekday() + 1) % 7]


def when(at):
    return f'{dname(at)} {at.day}.{at.month} · {at:%H:%M}'


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
        rows.append(dict(sid=sid, at=at, spec=spec, st=st, link=log.get(sid, {}).get('permalink'),
                         small=thumb(sid, 256), big=thumb(sid, 360)))
    if not rows:
        sys.exit('no schedule')
    counts = {k: sum(r['st'] == k for r in rows) for k in STATUS}
    assert sum(counts.values()) == len(rows)
    tz = rows[0]['at'].tzinfo
    today = now.astimezone(tz).date()
    nxt = next((r for r in rows if r['st'] != 'published'), None)
    first, last = rows[0]['at'].date(), rows[-1]['at'].date()

    # the one finding, under the title
    if counts['late']:
        finding = f'{counts["late"]} רילסים עברו את המועד ועוד לא פורסמו.'
    elif nxt:
        finding = f'הבא בתור: {when(nxt["at"])}, ״{esc(nxt["spec"]["hook"])}״.'
        finding += ' מוכן לפרסום.' if nxt['st'] == 'ready' else ' עוד לא רונדר.'
    else:
        finding = 'כל הרילסים בלוח פורסמו.'

    # punch card: one hole per reel, two per day
    by_day = {}
    for r in rows:
        by_day.setdefault(r['at'].date(), []).append(r)
    punch = ''.join(
        f'<div class="pday"><div class="holes">' +
        ''.join(f'<a class="hole h-{r["st"]}{" h-next" if r is nxt else ""}" href="#{r["sid"]}" data-id="{r["sid"]}" '
                f'title="{r["sid"]} · {r["at"]:%H:%M} · {STATUS[r["st"]]}"><span class="sr">{r["sid"]} {STATUS[r["st"]]}</span></a>' for r in rs) +
        f'</div><span>{dname(d)[:1]}׳ {d.day}.{d.month}</span></div>' for d, rs in by_day.items())
    legend = ''.join(f'<span class="lg"><i class="hole h-{k}"></i>{v}</span>' for k, v in STATUS.items() if counts[k])

    # calendar: Sunday-first weeks
    start = first - dt.timedelta(days=(first.weekday() + 1) % 7)
    cells, d = [], start
    while d <= last or (d - start).days % 7:
        reels = by_day.get(d, [])
        cls = ['day']
        if not first <= d <= last: cls.append('outside')
        elif not reels: cls.append('rest')
        if d == today: cls.append('today')
        body = ''.join(
            f'''<button type="button" class="reel s-{r['st']}" data-id="{r['sid']}" aria-controls="detail" aria-label="{r['sid']} {when(r['at'])}">
{f'<img src="{r["small"]}" alt="" loading="lazy">' if r['small'] else '<span class="noimg">ממתין לרינדור</span>'}
<span class="rmeta"><span class="t">{r['at']:%H:%M}</span><i class="dot d-{r['st']}" title="{STATUS[r['st']]}"></i></span>
<span class="rhook">{esc(r['spec']['hook'])}</span></button>''' for r in reels)
        if first <= d <= last and not reels:
            body = '<p class="note">אין פרסום בשבת</p>' if d.weekday() == 5 else '<p class="note">אין פרסום</p>'
        cells.append(f'<div class="{" ".join(cls)}"><div class="dnum"><span class="dw">{dname(d)}</span> {d.day}.{d.month}</div>{body}</div>')
        d += dt.timedelta(days=1)

    # detail panels for the rail, one per reel; the next one is shown at rest
    def detail(r):
        s = r['spec']
        items = ''.join(
            f'<li><b>{esc(i["title"])}</b>{(" " + esc(i["body"])) if i.get("body") else ""}'
            f'{(" <span class=\"flag f-" + i["tag"] + "\">" + ("ירוק" if i["tag"] == "green" else "אדום") + "</span>") if i.get("tag") else ""}</li>'
            for i in s['items'])
        cmd = f'python3 scripts/publish.py publish {r["sid"]} --yes'
        cover = f'<img src="{r["big"]}" alt="כיסוי {r["sid"]}">' if r['big'] else '<span class="noimg">ממתין לרינדור<br><code>scripts/daily.sh {int(r["sid"][3:5])}</code></span>'
        link = f'<a class="btn ghost" href="{esc(r["link"])}" target="_blank" rel="noopener">פתיחה באינסטגרם</a>' if r['link'] else ''
        return f'''<article class="detail" id="d-{r['sid']}" data-id="{r['sid']}"{'' if r is (nxt or rows[0]) else ' hidden'}>
<div class="dhead"><div class="dcover">{cover}</div><div class="dinfo">
<span class="pill p-{r['st']}">{STATUS[r['st']]}</span>
<h3>{esc(s['hook'])} <span>{esc(s['hookAccent'])}</span></h3>
<dl><div><dt>מועד</dt><dd>{when(r['at'])}</dd></div><div><dt>פורמט</dt><dd>{FORMAT[s['format']]}</dd></div>
<div><dt>מזהה</dt><dd><code>{r['sid']}</code></dd></div><div><dt>מוזיקה</dt><dd>לופ {s['music']}</dd></div></dl></div></div>
<h4>על המסך</h4><ol class="items">{items}</ol>
<p class="cta-line">סיום: <b>{esc(s['cta']['big'])}</b> {esc(s['cta']['accent'])}</p>
<h4>כיתוב</h4><div class="cap"><p>{esc(s['caption'])}</p><p class="tags">{' '.join(f'<bdi dir="auto">{esc(t)}</bdi>' for t in s['hashtags'])}</p></div>
<div class="acts"><button type="button" class="btn copy" data-text="{esc(caption_of(s))}">העתקת כיתוב</button>
<button type="button" class="btn ghost copy" data-text="{esc(cmd)}">העתקת פקודת פרסום</button>{link}</div></article>'''

    published = [r for r in rows if r['st'] == 'published'][-4:]
    recent = ''.join(f'<li><a href="#{r["sid"]}" data-id="{r["sid"]}">{esc(r["spec"]["hook"])}</a><span>{when(r["at"])}</span></li>' for r in reversed(published)) \
        or f'<li class="empty">עוד לא פורסם רילס. {("הראשון יוצא ב" + when(rows[0]["at"]) + ".") if rows[0]["st"] != "published" else ""}</li>'

    total = len(rows)
    kpis = [
        ('בלוח', total, f'{first.day}.{first.month} עד {last.day}.{last.month}, שניים ביום'),
        ('מוכנים לפרסום', counts['ready'], f'מתוך {total} · רונדרו ומחכים למועד'),
        ('פורסמו', counts['published'], f'מתוך {total} · לפי published.json'),
        ('ממתינים לרינדור', counts['missing'], 'scripts/daily.sh'),
    ]
    if counts['late']:
        kpis.append(('עברו את המועד', counts['late'], 'רונדרו ולא פורסמו'))
    kpi_html = ''.join(f'<div class="kpi{" bad" if k == "עברו את המועד" else ""}"><span class="kl">{k}</span><b>{v}</b><span class="kc">{c}</span></div>' for k, v, c in kpis)

    page = (TEMPLATE
            .replace('{{FINDING}}', finding)
            .replace('{{NEXTID}}', (nxt or rows[0])['sid'])
            .replace('{{KPIS}}', kpi_html).replace('{{KCOUNT}}', str(len(kpis)))
            .replace('{{PUNCH}}', punch).replace('{{LEGEND}}', legend)
            .replace('{{DONE}}', str(counts['published'])).replace('{{TOTAL}}', str(total))
            .replace('{{CELLS}}', '\n'.join(cells))
            .replace('{{DETAILS}}', '\n'.join(detail(r) for r in rows))
            .replace('{{RECENT}}', recent)
            .replace('{{UPDATED}}', now.astimezone(tz).strftime('%d.%m.%Y %H:%M')))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(page)
    print(OUT)


TEMPLATE = '''<title>Perko Reels Calendar</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta charset="utf-8">
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&display=swap">
<style>
/* Accent ladder on Perko's lime: the full lime only on small marks (punch holes, the selected reel, the primary button);
   pale lime tints for areas. One face, Heebo. Top bar over a fluid canvas, then 1fr + 384px rail, 24px gap.
   Grid at 1440: 1440 - 2x29 = 1382 = main 974 + 24 + rail 384. Calendar: 7 x 1fr, 8px gaps. */
:root{
 --ground:#F7F8F1;--surface:#FFFFFF;--raised:#F1F2EA;--border:#E5E7DC;--rule:#EFF0E8;--control:#CDD0C2;
 --text:#11130F;--muted:#565C4B;
 --lime:#D7FF35;--lime-50:#F8FFDC;--lime-100:#EEFCB8;--lime-ink:#3A4A00;
 --primary:#11130F;--primary-ink:#FFFFFF;
 --neg-bg:#FFEDEA;--neg-ink:#831C1E;--warn-bg:#FFF7E0;--warn-ink:#8A4A00;--neu-bg:#EEEFE8;--neu-ink:#3A3D33;
 --font:"Heebo",system-ui,-apple-system,"Segoe UI",sans-serif;
 --mono:ui-monospace,"SFMono-Regular",Menlo,monospace;
 --gap:24px;--r:8px;--r-s:6px;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
 --ground:#0E0F0C;--surface:#161813;--raised:#1D2019;--border:#2A2D24;--rule:#22251D;--control:#3E4236;
 --text:#F1F2EB;--muted:#A7AD99;--lime-50:#1C220C;--lime-100:#26300C;--lime-ink:#DDF77A;
 --primary:#D7FF35;--primary-ink:#11130F;--neg-bg:#3A1714;--neg-ink:#FFB4AB;--warn-bg:#33240A;--warn-ink:#F5C46B;--neu-bg:#25281F;--neu-ink:#D2D6C6;color-scheme:dark}}
:root[data-theme="dark"]{
 --ground:#0E0F0C;--surface:#161813;--raised:#1D2019;--border:#2A2D24;--rule:#22251D;--control:#3E4236;
 --text:#F1F2EB;--muted:#A7AD99;--lime-50:#1C220C;--lime-100:#26300C;--lime-ink:#DDF77A;
 --primary:#D7FF35;--primary-ink:#11130F;--neg-bg:#3A1714;--neg-ink:#FFB4AB;--warn-bg:#33240A;--warn-ink:#F5C46B;--neu-bg:#25281F;--neu-ink:#D2D6C6;color-scheme:dark}
*{box-sizing:border-box}[hidden]{display:none!important}
body{background:var(--ground);color:var(--text);font:400 14px/20px var(--font);direction:rtl;font-variant-numeric:tabular-nums}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:10;background:var(--surface)}
.top{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--surface);border-bottom:1px solid var(--border);
 height:56px;display:flex;align-items:center;gap:16px;padding-left:max(29px,env(safe-area-inset-left,0px));padding-right:max(29px,env(safe-area-inset-right,0px))}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:16px}
.mark{width:22px;height:22px;border-radius:50%;background:var(--lime);display:grid;place-items:center;border:2px solid var(--text)}
.mark::after{content:"";width:6px;height:6px;border-radius:50%;background:var(--text)}
.brand small{font-weight:400;color:var(--muted);font-size:14px}
.top .fresh{margin-inline-start:auto;color:var(--muted);font-size:12px}
.scope{border-inline-start:1px solid var(--border);height:100%;display:flex;align-items:center;gap:8px;padding-inline-start:16px;font-weight:500}
.scope bdi{color:var(--muted);font-weight:400}
main{max-width:1440px;margin:0 auto;padding-block:28px 48px;padding-left:max(29px,env(safe-area-inset-left,0px));padding-right:max(29px,env(safe-area-inset-right,0px));display:grid;gap:16px}
.titlerow{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px 24px}
h1{font-size:24px;line-height:32px;font-weight:700;margin:0;letter-spacing:-.01em}
.finding{margin:4px 0 0;font-size:16px;line-height:24px}
.btn{font:500 14px/20px var(--font);border-radius:var(--r-s);padding:7px 14px;border:1px solid transparent;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;
 background:var(--primary);color:var(--primary-ink);transition:transform .08s,background-color .15s}
.btn:hover{filter:brightness(1.15)}.btn:active{transform:translateY(1px)}
.btn.ghost{background:var(--surface);color:var(--text);border-color:var(--control)}.btn.ghost:hover{background:var(--raised);filter:none}
.btn:focus-visible,.reel:focus-visible,.hole:focus-visible,a:focus-visible{outline:2px solid var(--text);outline-offset:2px}
.grid{display:grid;grid-template-columns:minmax(0,1fr) 384px;gap:var(--gap);align-items:start}
.col{display:grid;gap:16px;min-width:0}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r)}
.kpis{display:grid;grid-template-columns:repeat({{KCOUNT}},minmax(0,1fr))}
.kpi{padding:14px 20px;display:grid;gap:2px;min-width:0}.kpi+.kpi{border-inline-start:1px solid var(--border)}
.kl{color:var(--muted)}.kpi b{font-size:24px;line-height:32px;font-weight:500}.kc{font-size:12px;line-height:16px;color:var(--muted)}
.kpi.bad b{color:var(--neg-ink)}
.chead{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px;padding:14px 20px 0}
.chead h2{font-size:16px;line-height:24px;font-weight:500;margin:0}.chead p{margin:0;color:var(--muted);font-size:12px}
.punch{padding:14px 20px 16px;display:flex;flex-wrap:wrap;gap:14px 18px}
.pday{display:grid;justify-items:center;gap:6px;font-size:12px;color:var(--muted)}
.holes{display:flex;gap:6px}
.hole{width:26px;height:26px;border-radius:50%;display:block;border:2px solid var(--text);background:var(--surface)}
a.hole:hover{background:var(--lime-100)}
.h-published{background:var(--lime);border-color:var(--text)}
.h-missing{border:2px dashed var(--control)}
.h-late{border-color:var(--neg-ink);background:var(--neg-bg)}
.hole.sel{outline:2px solid var(--text);outline-offset:3px}
.legend{display:flex;flex-wrap:wrap;gap:6px 16px;padding:0 20px 14px;color:var(--muted);font-size:12px}
.lg{display:inline-flex;align-items:center;gap:6px}.lg .hole{width:14px;height:14px;border-width:2px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.cal{padding:12px 16px 16px;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}
.wd{font-size:12px;color:var(--muted);padding-inline:4px}
.day{min-width:0;display:flex;flex-direction:column;gap:8px;padding:6px;border-radius:var(--r-s);background:var(--surface);border:1px solid var(--rule)}
.day.rest,.day.outside{background:var(--raised);border-color:transparent}
.day.outside .dnum{opacity:.55}
.day.today{border-color:var(--text)}
.dnum{font-size:12px;font-weight:500}.dnum .dw{display:none}
.note{margin:0;font-size:12px;color:var(--muted)}
.reel{all:unset;cursor:pointer;display:grid;gap:4px;border-radius:var(--r-s);padding:3px;border:2px solid transparent;transition:background-color .12s}
.reel:hover{background:var(--lime-50)}
.reel.sel{background:var(--lime-100);border-color:var(--text)}
.reel img,.noimg{width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:4px;display:block;max-width:100%;background:var(--raised)}
.noimg{display:grid;place-items:center;text-align:center;padding:8px;color:var(--muted);font-size:12px;border:1px dashed var(--control)}
.rmeta{display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:500}
.dot{width:10px;height:10px;border-radius:50%;border:2px solid var(--text);display:block}
.d-published{background:var(--lime)}.d-missing{border-style:dashed;border-color:var(--control)}.d-late{border-color:var(--neg-ink);background:var(--neg-bg)}
.rhook{font-size:12px;line-height:16px;font-weight:700;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.rail{display:grid;gap:8px;min-width:0}
.rail h2{font-size:16px;line-height:24px;font-weight:500;margin:0}
.rail h2+.card{margin-bottom:8px}
.detail{padding:16px;display:grid;gap:12px}
.dhead{display:grid;grid-template-columns:132px minmax(0,1fr);gap:16px;align-items:start}
.dcover img,.dcover .noimg{width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:var(--r-s);display:block;max-width:100%}
.dinfo{display:grid;gap:8px;min-width:0;justify-items:start}
.dinfo h3{margin:0;font-size:18px;line-height:24px;font-weight:700;text-wrap:balance}.dinfo h3 span{font-weight:400}
dl{margin:0;display:grid;gap:4px;width:100%}dl div{display:flex;justify-content:space-between;gap:8px;font-size:13px}
dt{color:var(--muted)}dd{margin:0;text-align:left}
code{font-family:var(--mono);font-size:12px}
.pill{font-size:12px;line-height:20px;padding:0 8px;border-radius:999px;font-weight:500}
.p-published{background:var(--lime-100);color:var(--lime-ink)}.p-ready{background:var(--neu-bg);color:var(--neu-ink)}
.p-missing{background:var(--warn-bg);color:var(--warn-ink)}.p-late{background:var(--neg-bg);color:var(--neg-ink)}
h4{margin:0;font-size:12px;font-weight:500;color:var(--muted)}
.items{margin:-6px 0 0;padding-inline-start:18px;display:grid;gap:4px}
.flag{font-size:12px;padding:0 6px;border-radius:999px;margin-inline-start:4px}
.f-green{background:var(--lime-100);color:var(--lime-ink)}.f-red{background:var(--neg-bg);color:var(--neg-ink)}
.cta-line{margin:0;color:var(--muted)}.cta-line b{color:var(--text)}
.cap p{margin:0}.cap .tags{margin-top:10px;color:var(--muted)}
.cap{margin:-6px 0 0;font:400 14px/22px var(--font);background:var(--raised);border-radius:var(--r-s);padding:10px 12px}
.acts{display:flex;flex-wrap:wrap;gap:8px}
.recent{list-style:none;margin:0;padding:4px 16px}
.recent li{display:flex;justify-content:space-between;gap:8px;padding:12px 0;border-bottom:1px solid var(--rule)}.recent li:last-child{border:0}
.recent a{color:var(--text);font-weight:500}.recent span{color:var(--muted);font-size:12px}
.recent .empty{color:var(--muted)}
footer{color:var(--muted);font-size:12px}
@media (max-width:1100px){.grid{grid-template-columns:minmax(0,1fr)}.rail{order:-1}}
@media (max-width:720px){
 .top{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));gap:10px}
 .top .fresh,.brand small{display:none}
 main{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:20px 40px}
 .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.kpi{padding:12px 14px}
 .kpi:nth-child(odd){border-inline-start:0}.kpi:nth-child(n+3){border-top:1px solid var(--border)}
 .cal{grid-template-columns:minmax(0,1fr)}.wd,.day.outside{display:none}
 .day{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.day .dnum,.day .note{grid-column:1/-1}.dnum .dw{display:inline}
 .dhead{grid-template-columns:104px minmax(0,1fr)}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
<header class="top"><div class="brand"><span class="mark" aria-hidden="true"></span>Perko <small>רילס יומי</small></div>
<span class="fresh">עודכן {{UPDATED}}</span><div class="scope">אינסטגרם <bdi dir="ltr">@getperko</bdi></div></header>
<main>
<div class="titlerow"><div><h1>לוח רילס</h1><p class="finding">{{FINDING}}</p></div>
<button type="button" class="btn copy" data-text="python3 scripts/publish.py due --yes">העתקת פקודת ״פרסום הבא״</button></div>
<div class="grid">
<div class="col">
<section class="card kpis" aria-label="סיכום">{{KPIS}}</section>
<section class="card"><div class="chead"><h2>כרטיסיית השבוע</h2><p>חור לכל רילס · {{DONE}} מתוך {{TOTAL}} נוקבו</p></div>
<div class="punch">{{PUNCH}}</div><div class="legend">{{LEGEND}}</div></section>
<section class="card"><div class="chead"><h2>לוח שנה</h2><p>12:30 טיפ לעסק · 19:30 פורמט טרנדי · שעון ישראל</p></div>
<div class="cal"><span class="wd">ראשון</span><span class="wd">שני</span><span class="wd">שלישי</span><span class="wd">רביעי</span><span class="wd">חמישי</span><span class="wd">שישי</span><span class="wd">שבת</span>
{{CELLS}}</div></section>
</div>
<aside class="rail"><h2>רילס נבחר</h2><div class="card" id="detail" aria-live="polite">{{DETAILS}}</div>
<h2>פורסמו לאחרונה</h2><ul class="card recent">{{RECENT}}</ul></aside>
</div>
<footer>נוצר מ-video-app/scripts/dashboard.py מתוך content/daily ו-published.json. לחיצה על כיסוי או על חור בכרטיסייה מציגה את הרילס.</footer>
</main>
<script>
(function(){
 function pick(id,scroll){
  var d=document.getElementById('d-'+id);if(!d)return;
  document.querySelectorAll('.detail').forEach(function(x){x.hidden=x!==d});
  document.querySelectorAll('[data-id]').forEach(function(x){if(!x.classList.contains('detail'))x.classList.toggle('sel',x.dataset.id===id)});
  if(scroll&&window.matchMedia('(max-width:1100px)').matches)document.getElementById('detail').scrollIntoView({block:'start'});
 }
 document.addEventListener('click',function(e){
  var c=e.target.closest('.copy');
  if(c){var t=c.dataset.text,l=c.textContent;
   (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){c.textContent='הועתק'},function(){c.textContent='לא הועתק, סמנו ידנית'})
   .finally(function(){setTimeout(function(){c.textContent=l},1600)});return}
  var r=e.target.closest('[data-id]');if(r&&!r.classList.contains('detail')){e.preventDefault();pick(r.dataset.id,true);try{history.replaceState(null,'','#'+r.dataset.id)}catch(_){}}
 });
 var h=location.hash.slice(1);pick(document.getElementById('d-'+h)?h:'{{NEXTID}}',false);
 window.addEventListener('hashchange',function(){pick(location.hash.slice(1),true)});
})();
</script>
'''

if __name__ == '__main__':
    main()
