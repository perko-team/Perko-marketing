"""Content bank for the daily reels: two a day. Slot a = a tip for small businesses, slot b = a trending format.
Rules: no invented numbers or studies, no real businesses named, plural/neutral Hebrew, no digits in on-screen titles
(the letter-by-letter reveal would reverse them). Run: python3 content/build.py -> content/daily/dayNN-{a,b}.json
"""
import json, pathlib

OUT = pathlib.Path(__file__).parent / 'daily'
OUT.mkdir(exist_ok=True)

BIZ = {'big': 'יש לכם עסק בשכונה?', 'accent': 'הצטרפו לגישה המוקדמת', 'mono': 'בחינם · הקישור בביו'}
FOLLOW = {'big': 'עקבו', 'accent': 'טיפ חדש לעסק כל יום', 'mono': '@getperko'}
TAGS_BIZ = ['#עסקקטן', '#שיווקלעסקים', '#נאמנותלקוחות', '#ירושלים', '#getperko']
TAGS_FUN = ['#בעליעסקים', '#עסקקטן', '#הומורלעסקים', '#ירושלים', '#getperko']

days = [
  # day 1
  (dict(format='tips', topic='טיפים לעסקים', hook='לקוח חוזר', hookAccent='שווה יותר מלקוח חדש.', items=[
      dict(title='תזכרו שמות', body='לקוח שקוראים לו בשם מרגיש בבית, וחוזר.'),
      dict(title='תנו סיבה לחזור', body='כרטיסייה, הטבה קטנה או משהו חדש בכל שבוע.'),
      dict(title='תגידו תודה', body='מילה אחת בקופה עושה יותר ממבצע.')], cta=BIZ,
      caption='שלושה דברים קטנים שגורמים ללקוחות לחזור. איזה מהם אתם כבר עושים?'),
   dict(format='pov', topic='בעלי עסקים', hook='אף אחד:', hookAccent='בעל העסק בשמונה בבוקר:', items=[
      dict(title='מסדר את הוויטרינה', body='בפעם השלישית.'),
      dict(title='מחכה לקבוע הראשון', body='זה שתמיד מגיע ראשון.'),
      dict(title='הוא מגיע', body='והיום מתחיל באמת.')], cta=FOLLOW,
      caption='תייגו בעל עסק שמכיר את הבוקר הזה ☕')),
  # day 2
  (dict(format='myth', topic='מיתוסים בשיווק', hook='מיתוס או אמת?', hookAccent='על נאמנות לקוחות.', items=[
      dict(title='צריך הנחה גדולה', body='כדי שיחזרו.'),
      dict(title='צריך סיבה לחזור', body='הטבה קטנה ועקבית עובדת טוב יותר מהנחה חד-פעמית.')], cta=BIZ,
      caption='לא כל לקוח צריך הנחה. רוב הלקוחות צריכים סיבה.'),
   dict(format='flags', topic='דגלים בעסק', hook='דגל אדום', hookAccent='או דגל ירוק?', items=[
      dict(title='כרטיסייה מקומטת בארנק', tag='red'),
      dict(title='לקוח שמכיר את הצוות בשם', tag='green'),
      dict(title='אותו מבצע כבר שנה', tag='red'),
      dict(title='משהו חדש כל עונה', tag='green')], cta=FOLLOW,
      caption='כמה ירוקים יש אצלכם? 🟢🔴')),
  # day 3
  (dict(format='tips', topic='טיפים לעסקים', hook='לפני שמוציאים', hookAccent='עוד שקל על פרסום.', items=[
      dict(title='בדקו מי כבר חוזר', body='הלקוחות הקבועים הם הקהל הכי זול להחזיר.'),
      dict(title='שאלו מה הם אוהבים', body='שאלה אחת בקופה שווה סקר שלם.'),
      dict(title='תתגמלו אותם', body='משהו קטן שמרגיש אישי.')], cta=BIZ,
      caption='הפרסום הכי טוב כבר נמצא אצלכם בעסק.'),
   dict(format='pov', topic='לקוחות', hook='דמיינו:', hookAccent='פתחתם את הארנק בקופה.', items=[
      dict(title='כרטיסייה של הקפה', body='חסרות שתי חותמות.'),
      dict(title='כרטיסייה של המאפייה', body='איפה היא בכלל?'),
      dict(title='עשר כרטיסיות אחר כך', body='שילמתם בלי כלום.')], cta=FOLLOW,
      caption='מכירים את זה? 😅 בגלל זה בנינו את Perko.')),
  # day 4
  (dict(format='tips', topic='טיפים לעסקים', hook='שקט בעסק?', hookAccent='שלושה רעיונות להיום.', items=[
      dict(title='הודעה לקבועים', body='תזכורת קטנה ואישית, לא ספאם.'),
      dict(title='הטבה לשעה שקטה', body='הטבה רק בשעות המתות.'),
      dict(title='שיתוף עם השכן', body='עסק ליד עסק מביאים זה לזה לקוחות.')], cta=BIZ,
      caption='שעות שקטות הן הזדמנות, לא בעיה.'),
   dict(format='flags', topic='דגלים בעסק', hook='לקוח קבוע', hookAccent='זה כש...', items=[
      dict(title='מזמין בלי להסתכל בתפריט', tag='green'),
      dict(title='יודע איפה הסוכר', tag='green'),
      dict(title='אומר שלום לצוות בשם', tag='green')], cta=FOLLOW,
      caption='תייגו את הלקוח הכי קבוע שלכם 🙌')),
  # day 5
  (dict(format='myth', topic='מיתוסים בשיווק', hook='מיתוס או אמת?', hookAccent='על עסקים קטנים.', items=[
      dict(title='אין לי זמן לשיווק', body=''),
      dict(title='שיווק יכול להיות קטן', body='דקה ביום עם הלקוחות שכבר כאן.')], cta=BIZ,
      caption='שיווק לא חייב להיות קמפיין. לפעמים הוא חיוך בקופה.'),
   dict(format='pov', topic='בעלי עסקים', hook='אף אחד:', hookAccent='בעל עסק בסוף יום:', items=[
      dict(title='סופר את הקופה', body='פעמיים.'),
      dict(title='מסדר את הכיסאות', body='אחד אחד.'),
      dict(title='כבר חושב על מחר', body='כי זה העסק שלו.')], cta=FOLLOW,
      caption='לכל בעלי העסקים שסוגרים אחרונים 🌙')),
  # day 6
  (dict(format='tips', topic='טיפים לעסקים', hook='כרטיסייה טובה', hookAccent='עובדת ככה.', items=[
      dict(title='יעד שאפשר להשיג', body='לא כל כך רחוק שמוותרים באמצע.'),
      dict(title='הטבה שבאמת רוצים', body='משהו מהעסק, לא מתנה מקרית.'),
      dict(title='בלי לאבד אותה', body='כרטיסייה דיגיטלית לא נשכחת בכיס.')], cta=BIZ,
      caption='כרטיסייה היא לא נייר. היא הבטחה ללקוח.'),
   dict(format='flags', topic='דגלים בעסק', hook='דגל אדום', hookAccent='בכרטיסיית ניקוב.', items=[
      dict(title='נשארה בבית', tag='red'),
      dict(title='נרטבה בכביסה', tag='red'),
      dict(title='אחת בארנק, אחת בטלפון', tag='green')], cta=FOLLOW,
      caption='כמה כרטיסיות איבדתם השנה? 🫠')),
  # day 7
  (dict(format='tips', topic='טיפים לעסקים', hook='ביקורת שלילית?', hookAccent='ככה עונים.', items=[
      dict(title='עונים מהר', body='שקט נראה כמו אדישות.'),
      dict(title='בלי להתווכח', body='מודים, מסבירים בקצרה, מציעים פתרון.'),
      dict(title='מזמינים לחזור', body='לקוח שקיבל יחס טוב אחרי תקלה נזכר בזה.')], cta=BIZ,
      caption='הדרך שבה עונים לביקורת מראה יותר מהביקורת עצמה.'),
   dict(format='pov', topic='לקוחות', hook='דמיינו:', hookAccent='השלמתם את הכרטיסייה.', items=[
      dict(title='חותמת אחרונה', body='הקופאי מחייך.'),
      dict(title='הקפה עליהם', body='הכי טעים השבוע.'),
      dict(title='כרטיסייה חדשה', body='מתחילים מחדש.')], cta=FOLLOW,
      caption='התחושה הכי טובה בשכונה ☕✨')),
]

for d, (a, b) in enumerate(days, 1):
    for slot, s in (('a', a), ('b', b)):
        s = {'id': f'day{d:02d}-{slot}', **s}
        s['items'] = [{k: v for k, v in it.items() if v != ''} for it in s['items']]
        s['music'] = (2 * (d - 1) + (slot == 'b')) % 4 + 1
        s['hashtags'] = TAGS_BIZ if slot == 'a' else TAGS_FUN
        (OUT / f"{s['id']}.json").write_text(json.dumps(s, ensure_ascii=False, indent=1))
(OUT / 'sample.json').write_text((OUT / 'day01-a.json').read_text())
print(len(days) * 2, 'specs')
