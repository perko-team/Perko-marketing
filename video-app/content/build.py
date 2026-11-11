"""Content bank for the daily reels: two a day. Slot a = a tip for small businesses, slot b = a trending format.
Rules: no invented numbers or studies, no real businesses named, plural/neutral Hebrew, no digits in item titles
(their letter-by-letter reveal would reverse them; the hook is static, so it may hold a count).
Hooks follow content/HOOKS.md and are checked by lint() below. Run: python3 content/build.py -> content/daily/dayNN-{a,b}.json
"""
import json, pathlib

OUT = pathlib.Path(__file__).parent / 'daily'
OUT.mkdir(exist_ok=True)

BIZ = {'big': 'יש לכם עסק בשכונה?', 'accent': 'הצטרפו לגישה המוקדמת', 'mono': 'בחינם · הקישור בביו'}
SEND = {'big': 'שלחו לבעל עסק', 'accent': 'שצריך לראות את זה', 'mono': '@getperko'}  # sends per reach: HOOKS.md
TAGS_BIZ = ['#עסקקטן', '#שיווקלעסקים', '#נאמנותלקוחות', '#ירושלים', '#getperko']
TAGS_FUN = ['#בעליעסקים', '#עסקקטן', '#הומורלעסקים', '#ירושלים', '#getperko']

days = [
  # day 1
  (dict(format='tips', topic='טיפים לעסקים', hookType='list', hook='3 דברים', hookAccent='שגורמים ללקוח לחזור מחר.', items=[
      dict(title='תזכרו שמות', body='לקוח שקוראים לו בשם מרגיש בבית, וחוזר.'),
      dict(title='תנו סיבה לחזור', body='כרטיסייה, הטבה קטנה או משהו חדש בכל שבוע.'),
      dict(title='תגידו תודה', body='מילה אחת בקופה עושה יותר ממבצע.')], cta=BIZ,
      caption='שלושה דברים קטנים שגורמים ללקוחות לחזור. איזה מהם אתם כבר עושים?'),
   dict(format='pov', topic='בעלי עסקים', hookType='pov', hook='אף אחד:', hookAccent='בעל העסק בשמונה בבוקר:', items=[
      dict(title='מסדר את הוויטרינה', body='בפעם השלישית.'),
      dict(title='מחכה לקבוע הראשון', body='זה שתמיד מגיע ראשון.'),
      dict(title='הוא מגיע', body='והיום מתחיל באמת.')], cta=SEND,
      caption='תייגו בעל עסק שמכיר את הבוקר הזה ☕')),
  # day 2
  (dict(format='myth', topic='מיתוסים בשיווק', hookType='quiz', hook='מיתוס או אמת?', hookAccent='״רק הנחה גדולה מחזירה לקוחות.״', items=[
      dict(title='צריך הנחה גדולה', body='כדי שיחזרו.'),
      dict(title='צריך סיבה לחזור', body='הטבה קטנה ועקבית עובדת טוב יותר מהנחה חד-פעמית.')], cta=BIZ,
      caption='לא כל לקוח צריך הנחה. רוב הלקוחות צריכים סיבה.'),
   dict(format='flags', topic='דגלים בעסק', hookType='quiz', hook='דגל אדום', hookAccent='או דגל ירוק? תחליטו לפני שנגלה.', items=[
      dict(title='כרטיסייה מקומטת בארנק', tag='red'),
      dict(title='לקוח שמכיר את הצוות בשם', tag='green'),
      dict(title='אותו מבצע כבר שנה', tag='red'),
      dict(title='משהו חדש כל עונה', tag='green')], cta=SEND,
      caption='כמה ירוקים יש אצלכם? 🟢🔴')),
  # day 3
  (dict(format='tips', topic='טיפים לעסקים', hookType='stop', hook='עצרו.', hookAccent='לפני עוד שקל על פרסום.', items=[
      dict(title='בדקו מי כבר חוזר', body='הלקוחות הקבועים הם הקהל הכי זול להחזיר.'),
      dict(title='שאלו מה הם אוהבים', body='שאלה אחת בקופה שווה סקר שלם.'),
      dict(title='תתגמלו אותם', body='משהו קטן שמרגיש אישי.')], cta=BIZ,
      caption='הפרסום הכי טוב כבר נמצא אצלכם בעסק.'),
   dict(format='pov', topic='לקוחות', hookType='relatable', hook='עשר כרטיסיות בארנק', hookAccent='ואף אחת לא מלאה.', items=[
      dict(title='כרטיסייה של הקפה', body='חסרות שתי חותמות.'),
      dict(title='כרטיסייה של המאפייה', body='איפה היא בכלל?'),
      dict(title='ועוד שמונה כאלה', body='ושילמתם בלי כלום.')], cta=SEND,
      caption='מכירים את זה? 😅 בגלל זה בנינו את Perko.')),
  # day 4
  (dict(format='tips', topic='טיפים לעסקים', hookType='symptom', hook='שקט בעסק היום?', hookAccent='3 דברים לעשות עד הערב.', items=[
      dict(title='הודעה לקבועים', body='תזכורת קטנה ואישית, לא ספאם.'),
      dict(title='הטבה לשעה שקטה', body='הטבה רק בשעות המתות.'),
      dict(title='שיתוף עם השכן', body='עסק ליד עסק מביאים זה לזה לקוחות.')], cta=BIZ,
      caption='שעות שקטות הן הזדמנות, לא בעיה.'),
   dict(format='flags', topic='דגלים בעסק', hookType='incomplete', hook='לקוח קבוע', hookAccent='זה כש...', items=[
      dict(title='מזמין בלי להסתכל בתפריט', tag='green'),
      dict(title='יודע איפה הסוכר', tag='green'),
      dict(title='אומר שלום לצוות בשם', tag='green')], cta=SEND,
      caption='תייגו את הלקוח הכי קבוע שלכם 🙌')),
  # day 5
  (dict(format='myth', topic='מיתוסים בשיווק', hookType='quiz', hook='מיתוס או אמת?', hookAccent='״אין לי זמן לשיווק.״', items=[
      dict(title='אין לי זמן לשיווק', body=''),
      dict(title='שיווק יכול להיות קטן', body='דקה ביום עם הלקוחות שכבר כאן.')], cta=BIZ,
      caption='שיווק לא חייב להיות קמפיין. לפעמים הוא חיוך בקופה.'),
   dict(format='pov', topic='בעלי עסקים', hookType='pov', hook='אף אחד:', hookAccent='בעל עסק בסוף יום:', items=[
      dict(title='סופר את הקופה', body='פעמיים.'),
      dict(title='מסדר את הכיסאות', body='אחד אחד.'),
      dict(title='כבר חושב על מחר', body='כי זה העסק שלו.')], cta=SEND,
      caption='לכל בעלי העסקים שסוגרים אחרונים 🌙')),
  # day 6
  (dict(format='tips', topic='טיפים לעסקים', hookType='mistake', hook='הטעות בכרטיסייה', hookAccent='שגורמת ללקוחות לוותר באמצע.', items=[
      dict(title='יעד שאפשר להשיג', body='לא כל כך רחוק שמוותרים באמצע.'),
      dict(title='הטבה שבאמת רוצים', body='משהו מהעסק, לא מתנה מקרית.'),
      dict(title='בלי לאבד אותה', body='כרטיסייה דיגיטלית לא נשכחת בכיס.')], cta=BIZ,
      caption='כרטיסייה היא לא נייר. היא הבטחה ללקוח.'),
   dict(format='flags', topic='דגלים בעסק', hookType='quiz', hook='דגל אדום', hookAccent='בכרטיסיית ניקוב. כמה מהם קרו לכם?', items=[
      dict(title='נשארה בבית', tag='red'),
      dict(title='נרטבה בכביסה', tag='red'),
      dict(title='אחת בארנק, אחת בטלפון', tag='green')], cta=SEND,
      caption='כמה כרטיסיות איבדתם השנה? 🫠')),
  # day 7
  (dict(format='tips', topic='טיפים לעסקים', hookType='symptom', hook='ביקורת שלילית?', hookAccent='ככה עונים בלי לאבד את הלקוח.', items=[
      dict(title='עונים מהר', body='שקט נראה כמו אדישות.'),
      dict(title='בלי להתווכח', body='מודים, מסבירים בקצרה, מציעים פתרון.'),
      dict(title='מזמינים לחזור', body='לקוח שקיבל יחס טוב אחרי תקלה נזכר בזה.')], cta=BIZ,
      caption='הדרך שבה עונים לביקורת מראה יותר מהביקורת עצמה.'),
   dict(format='pov', topic='לקוחות', hookType='pov', hook='דמיינו:', hookAccent='החותמת האחרונה בכרטיסייה.', items=[
      dict(title='חותמת אחרונה', body='הקופאי מחייך.'),
      dict(title='הקפה עליהם', body='הכי טעים השבוע.'),
      dict(title='כרטיסייה חדשה', body='מתחילים מחדש.')], cta=SEND,
      caption='התחושה הכי טובה בשכונה ☕✨')),
]

# What the viewer looks at under the words (src/daily/Props.tsx). Myth and flag items get a stamp or a flag
# automatically. App screens are the real app in demo mode (public/shots).
def card(n, name=None): return {'type': 'card', 'stamps': n, **({'name': name} if name else {})}
def phone(shot): return {'type': 'phone', 'shot': shot}
def chat(*lines): return {'type': 'chat', 'lines': [{'text': t[1:], 'me': True} if t.startswith('>') else {'text': t} for t in lines]}
def clock(t): return {'type': 'clock', 'time': t}
def receipt(*l): return {'type': 'receipt', 'lines': list(l)}
def stars(n): return {'type': 'stars', 'n': n}
def wallet(n): return {'type': 'wallet', 'cards': n}
APP, SENT = phone('wallet'), chat('>חייב לראות את זה')

VIS = {  # (hook, [items], cta); None = automatic
 'day01-a': (card(7, 'קפה פינה'), [chat('>היי דנה! כרגיל?'), phone('focus-coffee'), chat('>תודה! נתראה מחר')], APP),
 'day01-b': (clock('08:00'), [clock('08:05'), clock('08:20'), chat('בוקר טוב!', '>הרגיל?')], SENT),
 'day02-a': (receipt('קפה', 'הנחה', 'עוד הנחה'), [None, card(6, 'קבועים')], APP),
 'day02-b': ({'type': 'flag', 'tone': 'red'}, [None, None, None, None], SENT),
 'day03-a': (receipt('פרסום', 'עוד פרסום', 'ועוד פרסום'), [phone('focus-coffee'), chat('>מה הכי אהבת היום?', 'העוגה!'), card(10, 'מגיע לך')], APP),
 'day03-b': (wallet(10), [card(8, 'בית הקפה'), card(3, 'המאפייה'), wallet(8)], SENT),
 'day04-a': (clock('15:30'), [chat('>מתגעגעים! קפה עלינו היום'), receipt('שעה שקטה', 'מאפה מתנה'), chat('>אצלנו קפה, אצלכם עוגה?', 'סגרנו!')], APP),
 'day04-b': (card(9, 'הקבוע'), [None, None, None], SENT),
 'day05-a': (clock('23:00'), [None, phone('discover')], APP),
 'day05-b': (clock('22:00'), [receipt('ספירה ראשונה', 'ספירה שנייה'), clock('22:30'), chat('>מחר מנסים משהו חדש')], SENT),
 'day06-a': (card(2, 'עוד 18 חותמות'), [card(9, 'כמעט שם'), phone('redeem-a'), APP], phone('focus-zaatar')),
 'day06-b': (wallet(7), [None, None, None], SENT),
 'day07-a': (stars(2), [chat('הקפה הגיע קר', '>סליחה! מחליפים מיד'), stars(3), stars(5)], APP),
 'day07-b': (card(9, 'כמעט מלאה'), [card(10, 'מלאה!'), phone('redeem-b'), card(0, 'כרטיסייה חדשה')], SENT),
}


def visuals(s):
    hook, items, cta = VIS[s['id']]
    s['hookVisual'], s['ctaVisual'] = hook, cta
    for i, it in enumerate(s['items']):
        v = items[i] if i < len(items) else None
        if v is None and s['format'] == 'myth':
            v = {'type': 'stamp', 'text': 'מיתוס' if i % 2 == 0 else 'אמת', 'tone': 'red' if i % 2 == 0 else 'lime'}
        if v is None and s['format'] == 'flags':
            v = {'type': 'flag', 'tone': 'green' if it.get('tag') == 'green' else 'red'}
        if v: it['visual'] = v


HOOK_TYPES = {'list', 'symptom', 'mistake', 'stop', 'quiz', 'pov', 'relatable', 'incomplete'}
BANNED = ('עד הסוף', 'תצפו', 'לא תאמינו', 'שלום', 'היי ')


def lint(spec):
    """content/HOOKS.md rules that can be checked mechanically"""
    h, a = spec['hook'], spec['hookAccent']
    words = len(h.split()) + len(a.replace('...', ' ').split())
    errs = []
    if spec.get('hookType') not in HOOK_TYPES: errs.append(f"hookType {spec.get('hookType')!r}")
    if len(h.split()) > 4: errs.append('hook over 4 words')
    if words > 10: errs.append(f'hook + accent is {words} words (max 10)')
    if any(b in h + ' ' + a for b in BANNED): errs.append('runway or bait phrase')
    if spec['hookType'] == 'list':
        import re
        m = re.match(r'(\d+)', h)
        if m and int(m.group(1)) != len(spec['items']): errs.append('the count in the hook does not match the items')
    if any(ch.isdigit() for it in spec['items'] for ch in it['title']): errs.append('digit in an item title')
    if errs: raise SystemExit(f"{spec['id']}: " + '; '.join(errs))


for d, (a, b) in enumerate(days, 1):
    for slot, s in (('a', a), ('b', b)):
        s = {'id': f'day{d:02d}-{slot}', **s}
        s['items'] = [{k: v for k, v in it.items() if v != ''} for it in s['items']]
        s['music'] = (2 * (d - 1) + (slot == 'b')) % 4 + 1
        s['hashtags'] = TAGS_BIZ if slot == 'a' else TAGS_FUN
        visuals(s)
        lint(s)
        old = OUT / f"{s['id']}.json"
        if old.exists() and 'vo' in json.loads(old.read_text()):  # keep narration made by content/voiceover.py
            s['vo'] = json.loads(old.read_text())['vo']
        (OUT / f"{s['id']}.json").write_text(json.dumps(s, ensure_ascii=False, indent=1))
(OUT / 'sample.json').write_text((OUT / 'day01-a.json').read_text())
print(len(days) * 2, 'specs')
