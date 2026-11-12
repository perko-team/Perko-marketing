#!/usr/bin/env python3
"""
Maps Prospector (Israel): finds local businesses on Google Maps and writes a CSV of public business details.
Hebrew search, Israeli phone numbers (mobile / landline / VoIP / 1-700), Hebrew column names.

  python3 scrape_maps.py --sector "בתי קפה" --zona "ירושלים" --output prospects.csv [--max-results 60] [--enrich-email]

Every run also picks the 2 leads that fit Perko best (independent, repeat-visit business, well rated, reachable by
mobile or email), skips businesses offered in earlier runs (leads_history.json), and writes a ready first message
for each one to leads_<date>.md next to the CSV.

Only data the businesses published on Google Maps (and, with --enrich-email, on their own website).
Automated access to Google Maps is against Google's terms; use sparingly, slowly, and at your own risk.
Israeli law (Communications Law, section 30A): do not send ads by email, SMS, WhatsApp or automated calls to these
contacts without prior consent. A personal call or a visit is the safe first contact.
"""

import argparse
import csv
import random
import re
import time
from datetime import datetime
from urllib.parse import quote


def parse_args():
    p = argparse.ArgumentParser(description="Google Maps prospector for Israel")
    p.add_argument("--sector", required=True, help="סוג העסק, למשל: בתי קפה, מספרות, מאפיות")
    p.add_argument("--zona", required=True, help="עיר או שכונה, למשל: ירושלים, נחלאות, תל אביב")
    p.add_argument("--output", required=True, help="נתיב קובץ ה-CSV")
    p.add_argument("--max-results", type=int, default=60, help="מספר עסקים מרבי (Maps מחזיר עד כ-60)")
    p.add_argument("--enrich-email", action="store_true", help="לחפש מייל באתר של העסק")
    p.add_argument("--show-browser", action="store_true", help="להציג את הדפדפן (ברירת מחדל: מוסתר)")
    p.add_argument("--leads", type=int, default=2, help="כמה לידים אידיאליים לבחור בכל הרצה")
    p.add_argument("--sender", default="[השם שלך]", help="השם שיופיע בהודעה")
    p.add_argument("--history", default=None, help="קובץ עסקים שכבר הוצעו (ברירת מחדל: leads_history.json ליד ה-CSV)")
    return p.parse_args()


def delay(lo=0.8, hi=2.2):
    """Random pause, so the run looks like a person and is not blocked."""
    time.sleep(random.uniform(lo, hi))


# ─── Israeli phone numbers ───────────────────────────────────────────────────

def normalize_il(raw: str) -> str:
    """'+972 50-123-4567' / '050 1234567' / '1-700-500-500' -> digits in local form ('0501234567', '1700500500')."""
    d = re.sub(r"\D", "", raw or "")
    if d.startswith("972"):
        d = "0" + d[3:]
    return d


def classify_phone(raw: str) -> tuple[str, str, str]:
    """Returns (mobile, landline, other) with one filled.
    Mobile: 05X + 7 digits. Landline: 02/03/04/08/09 + 7 digits. Other: 07X VoIP, 1-700/1-800/1-599, *XXXX."""
    d = normalize_il(raw)
    if re.fullmatch(r"05\d{8}", d):
        return pretty(d), "", ""
    if re.fullmatch(r"0[23489]\d{7}", d):
        return "", pretty(d), ""
    if re.fullmatch(r"07\d{8}", d) or re.fullmatch(r"1(700|800|599)\d{6}", d) or re.fullmatch(r"\d{4}", d):
        return "", "", pretty(d)
    return "", "", ""


def pretty(d: str) -> str:
    """'0501234567' -> '050-123-4567', '021234567' -> '02-123-4567', '1700500500' -> '1-700-500-500'."""
    if len(d) == 10 and d.startswith("0"):
        return f"{d[:3]}-{d[3:6]}-{d[6:]}"
    if len(d) == 9 and d.startswith("0"):
        return f"{d[:2]}-{d[2:5]}-{d[5:]}"
    if len(d) == 10 and d.startswith("1"):
        return f"{d[0]}-{d[1:4]}-{d[4:7]}-{d[7:]}"
    return d


def area_from_address(address: str) -> str:
    """'יפו 12, ירושלים' -> 'ירושלים'; 'Jaffa St 12, Jerusalem, Israel' -> 'Jerusalem'.
    The last part that is not a postal code or the country."""
    if not address:
        return ""
    parts = [p.strip() for p in address.split(",") if p.strip()]
    for part in reversed(parts):
        if part in ("ישראל", "Israel") or re.fullmatch(r"\d{5,7}", part):
            continue
        return re.sub(r"\s*\d{5,7}\s*", " ", part).strip()
    return ""


def email_from_site(url: str) -> str:
    """Looks for one plain email address on the business's own homepage."""
    if not url:
        return ""
    try:
        import urllib.request
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; maps-prospector-il/1.0)"})
        with urllib.request.urlopen(req, timeout=8) as r:
            html = r.read().decode("utf-8", errors="ignore")[:80000]
        skip = ("example", "test", "noreply", "no-reply", "sentry", "schema.org", "wordpress", "wix", "jquery", "cdn", ".png", ".jpg")
        for e in re.findall(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", html):
            if not any(s in e.lower() for s in skip):
                return e.lower()
    except Exception:
        pass
    return ""


# ─── Scraper ─────────────────────────────────────────────────────────────────

def search_query(sector: str, zona: str) -> str:
    """'בתי קפה' + 'ירושלים' -> 'בתי קפה בירושלים' (no double ב)."""
    z = zona.strip()
    return f"{sector.strip()} {z}" if z.startswith("ב") and len(z) > 1 and z[1] == " " else f"{sector.strip()} ב{z}"


def text_of(page, selector: str) -> str:
    try:
        el = page.query_selector(selector)
        return el.inner_text().strip() if el else ""
    except Exception:
        return ""


def scrape(sector: str, zona: str, max_results: int, enrich_email: bool, headless: bool) -> list[dict]:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

    url = f"https://www.google.com/maps/search/{quote(search_query(sector, zona))}?hl=iw&gl=il"
    results, seen = [], set()

    with sync_playwright() as p:
        import os
        exe = os.environ.get("CHROMIUM_PATH")  # a preinstalled Chromium, when Playwright's own download is not there
        browser = p.chromium.launch(headless=headless, **({"executable_path": exe} if exe else {}))
        ctx = browser.new_context(locale="he-IL", timezone_id="Asia/Jerusalem",
                                  user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36")
        page = ctx.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            delay(2, 4)
            for sel in ['button[aria-label*="אישור הכול"]', 'button[aria-label*="קבלת הכול"]', 'button[aria-label*="Accept all"]', 'form:nth-child(2) button']:
                try:
                    b = page.query_selector(sel)
                    if b:
                        b.click(); delay(1, 2); break
                except Exception:
                    pass
            page.wait_for_selector('[role="feed"]', timeout=20000)
        except PWTimeout:
            print("[WARN] לא נמצאה רשימת תוצאות. ייתכן ש-Maps שינה את המבנה או שהחיפוש החזיר עסק בודד.")
            browser.close(); return results
        except Exception as e:
            print(f"[WARN] שגיאה בטעינת Google Maps: {e}")
            browser.close(); return results

        # scroll the results panel until enough items or no more appear
        prev, tries = 0, 0
        while tries < 15:
            n = len(page.query_selector_all('[role="feed"] a[href*="/maps/place/"]'))
            if n >= max_results or (n == prev and tries > 3):
                break
            prev = n
            page.evaluate("document.querySelector('[role=\"feed\"]') && (document.querySelector('[role=\"feed\"]').scrollTop += 900)")
            delay(1.5, 3)
            tries += 1

        items = page.query_selector_all('[role="feed"] a[href*="/maps/place/"]')
        print(f"[INFO] {len(items)} תוצאות ברשימה")

        for i, item in enumerate(items[:max_results]):
            try:
                item.click()
                delay(2, 3.5)
                name = text_of(page, 'h1.DUwDvf, h1[class*="fontHeadlineLarge"]')
                if not name:
                    continue
                row = {"שם": name, "קטגוריה": text_of(page, "button.DkEaL, .DkEaL") or sector}

                mobile = landline = other = ""
                for el in page.query_selector_all('[data-item-id^="phone:tel:"], button[aria-label^="טלפון"], button[aria-label^="Phone"]'):
                    raw = (el.get_attribute("data-item-id") or "").replace("phone:tel:", "") or (el.get_attribute("aria-label") or "")
                    m, l, o = classify_phone(raw)
                    mobile, landline, other = mobile or m, landline or l, other or o
                if not (mobile or landline or other):
                    print(f"[SKIP] {name}: אין טלפון")
                    continue
                row.update({"נייד": mobile, "נייח": landline, "טלפון אחר": other})

                row["כתובת"] = text_of(page, '[data-item-id="address"] .Io6YTe') or text_of(page, 'button[aria-label^="כתובת"] .Io6YTe')
                row["אזור"] = area_from_address(row["כתובת"])

                web = ""
                try:
                    a = page.query_selector('a[data-item-id="authority"], [data-item-id*="authority"] a')
                    web = a.get_attribute("href") if a else ""
                except Exception:
                    pass
                row["אתר"] = web or ""
                row["מייל"] = email_from_site(web) if enrich_email and web else ""

                rating = text_of(page, 'div.F7nice span[aria-hidden="true"]')
                row["דירוג"] = rating.replace(",", ".")
                reviews = ""
                try:
                    r = page.query_selector('div.F7nice span[aria-label*="ביקורות"], div.F7nice span[aria-label*="reviews"]')
                    if r:
                        reviews = re.sub(r"\D", "", r.get_attribute("aria-label") or "")
                except Exception:
                    pass
                row["ביקורות"] = reviews
                row["קישור במפות"] = page.url  # to verify each record by hand

                key = (name.lower(), row["כתובת"].lower())
                if key in seen:
                    continue
                seen.add(key)
                results.append(row)
                print(f"[OK] {len(results):03d} {name} | {mobile or landline or other} | {web or '-'}")
                delay(0.5, 1.5)
            except Exception as e:
                print(f"[ERR] עסק {i}: {e}")
        browser.close()
    return results


COLUMNS = ["שם", "קטגוריה", "נייד", "נייח", "טלפון אחר", "מייל", "אתר", "ביקורות", "דירוג", "אזור", "כתובת", "קישור במפות"]


def completeness(r: dict) -> int:
    return 2 * bool(r.get("נייד")) + bool(r.get("נייח")) + 3 * bool(r.get("מייל")) + 2 * bool(r.get("אתר")) + bool(r.get("ביקורות")) + bool(r.get("דירוג"))


# ─── The ideal leads for Perko ───────────────────────────────────────────────

# businesses people come back to, often weekly: where a punch card is natural
REPEAT = {
    "לחם": "לחמנייה מתנה בכל ביקור עשירי", "קפה": "קפה עשירי עליכם", "בית קפה": "קפה עשירי עליכם", "מאפי": "מאפה מתנה בכל ביקור עשירי", "קונדיטור": "עוגייה מתנה בכל ביקור שמיני",
    "גלידה": "גביע מתנה אחרי תשעה", "מספר": "תספורת שישית בחצי מחיר", "ציפורניים": "טיפול עשירי מתנה", "פיצ": "משולש מתנה בכל ביקור שמיני",
    "שווארמה": "מנה עשירית עליכם", "פלאפל": "מנה עשירית עליכם", "חומוס": "מנה עשירית עליכם", "מיץ": "שייק מתנה אחרי שמונה",
    "ירק": "סל פירות קטן בכל קנייה עשירית", "פרחים": "זר קטן מתנה בכל קנייה שמינית", "מעדני": "מגש קטן מתנה בכל ביקור עשירי",
    "כושר": "אימון חינם לחבר אחרי עשרה", "יוגה": "שיעור עשירי מתנה", "חיות": "חטיף לכלב מתנה בכל קנייה שמינית", "סושי": "רול עשירי עליכם",
    "cafe": "קפה עשירי עליכם", "coffee": "קפה עשירי עליכם", "bakery": "מאפה מתנה בכל ביקור עשירי", "barber": "תספורת שישית בחצי מחיר",
}
CHAINS = ("ארומה", "קפה קפה", "גרג", "לנדוור", "רולדין", "ביגה", "קפה ג'ו", "קפה גו", "מקדונלד", "דומינו", "פיצה האט", "BBB", "בורגרס בר",
          "אגדיר", "רמי לוי", "שופרסל", "סופר-פארם", "סופר פארם", "ויקטורי", "יוחננוף", "מקס ברנר", "נונה", "קופי בר", "Aroma", "Cofix", "קופיקס",
          "Arcaffe", "ארקפה", "Starbucks", "McDonald", "Domino", "Burger King", "בורגר קינג", "KFC", "לחם ארז", "אנג'ל", "Angel")


def reward_for(row: dict) -> str:
    # the name first ("לחם פיינגולד" is a bakery even when Maps files it as a café), then the category
    for text in (row.get("שם", "").lower(), row.get("קטגוריה", "").lower()):
        for k, v in REPEAT.items():
            if k in text:
                return v
    return ""


def fit_score(row: dict) -> float:
    """How well a business suits Perko: independent, people return often, well liked, busy but not huge, reachable."""
    if any(c.lower() in row["שם"].lower() for c in CHAINS):
        return -1
    if not (row.get("נייד") or row.get("מייל")):
        return -1  # an ideal lead is one you can reach directly: a mobile or an email
    s = 0.0
    s += 3 if reward_for(row) else 0
    try:
        r = float(row.get("דירוג") or 0)
        s += 2 if r >= 4.5 else 1 if r >= 4.2 else -1 if 0 < r < 3.8 else 0
    except ValueError:
        pass
    n = int(row.get("ביקורות") or 0)
    s += 2 if 40 <= n <= 1500 else 1 if 10 <= n < 40 else 0 if n < 10 else -1  # very many reviews often means a chain or a tourist spot
    s += 2 if row.get("נייד") else 0
    s += 1.5 if row.get("מייל") else 0
    s += 0.5 if row.get("אתר") else 0
    return s


def message(row: dict, sender: str, zona: str) -> dict:
    """A first message. Israeli law allows one request for consent to a business (Communications Law 30A(c));
    so it introduces, asks for ten minutes, and offers to stop."""
    name, reward = row["שם"], reward_for(row) or "הטבה קטנה בכל ביקור עשירי"
    area = row.get("אזור") or zona
    wa = (f"שלום, כאן {sender} מפרקו.\n\n"
          f"ראיתי את {name} ב{area}, עם הדירוג והביקורות שלכם, ונראה שיש לכם לקוחות שחוזרים.\n\n"
          f"אנחנו בונים כרטיס מועדון דיגיטלי אחד לעסקים בשכונה: הלקוח סורק קוד בקופה וצובר חותמות לפי הכללים שלכם, "
          f"למשל {reward}. אנחנו בגישה מוקדמת, וההצטרפות בחינם ובלי התחייבות.\n\n"
          f"אפשר לקפוץ אליכם לעשר דקות ולהראות? ואם זה לא רלוונטי, תגידו ולא אפנה שוב.")
    email = (f"נושא: {name} ופרקו - כרטיס מועדון דיגיטלי\n\n"
             f"שלום,\n\nכאן {sender} מפרקו. ראיתי את {name} ב{area} ואת הביקורות שלכם, ונראה שזה בדיוק עסק שאנשים חוזרים אליו.\n\n"
             f"פרקו היא אפליקציה אחת לכרטיסי מועדון של עסקים שכונתיים. במקום כרטיס נייר, הלקוח סורק קוד בקופה, "
             f"צובר חותמות לפי הכללים שאתם קובעים (למשל {reward}), ורואה באותה אפליקציה גם עסקים שכנים.\n\n"
             f"אנחנו בגישה מוקדמת ומחפשים עסקים ראשונים ב{area}. ההצטרפות כרגע בחינם ובלי התחייבות, ונעזור בהקמה.\n\n"
             f"אשמח לקפוץ ולהראות את זה בעשר דקות. מתי נוח לכם? אם זה לא רלוונטי, אפשר להשיב ״הסר״ ולא אפנה שוב.\n\n"
             f"תודה,\n{sender}\nפרקו · getperko.com")
    call = (f"שלום, מדבר/ת {sender} מפרקו. אפשר דקה? אנחנו בונים כרטיס מועדון דיגיטלי לעסקים בשכונה, "
            f"למשל {reward}, בחינם בגישה המוקדמת. אפשר לקפוץ אליכם לעשר דקות השבוע?")
    return {"whatsapp": wa, "email": email, "call": call}


def pick_leads(rows: list[dict], k: int, history: dict) -> list[dict]:
    fresh = [r for r in rows if r["שם"] not in history and fit_score(r) >= 0]
    return sorted(fresh, key=fit_score, reverse=True)[:k]


def write_leads(leads: list[dict], path, sender: str, zona: str, sector: str):
    out = [f"# {len(leads)} לידים אידיאליים: {sector} ב{zona} ({datetime.now():%d.%m.%Y})", "",
           "> פנייה ראשונה אחת בלבד, ובקשה להסכמה (חוק התקשורת, סעיף 30א). מי שמבקש לא לפנות שוב, לא פונים.", ""]
    for i, r in enumerate(leads, 1):
        m = message(r, sender, zona)
        why = [x for x in (reward_for(r) and "עסק שחוזרים אליו", r.get("דירוג") and f"דירוג {r['דירוג']}",
                           r.get("ביקורות") and f"{r['ביקורות']} ביקורות", "עצמאי (לא רשת)") if x]
        out += [f"## {i}. {r['שם']}", "",
                f"- **קטגוריה:** {r.get('קטגוריה', '')}",
                f"- **נייד:** {r.get('נייד') or '-'}" + (f" · **נייח:** {r['נייח']}" if r.get('נייח') else ""),
                f"- **מייל:** {r.get('מייל') or '-'}",
                f"- **אתר:** {r.get('אתר') or '-'}",
                f"- **כתובת:** {r.get('כתובת') or '-'}",
                f"- **במפות:** {r.get('קישור במפות', '')}",
                f"- **למה הוא מתאים:** {', '.join(why)}", ""]
        if r.get("נייד"):
            out += ["**וואטסאפ / SMS:**", "", "```", m["whatsapp"].replace("\\n", "\n"), "```", "", "**שיחה (פתיח):**", "", "```", m["call"], "```", ""]
        if r.get("מייל"):
            out += ["**מייל:**", "", "```", m["email"].replace("\\n", "\n"), "```", ""]
    path.write_text("\n".join(out), encoding="utf-8")


def main():
    a = parse_args()
    print(f"[START] {search_query(a.sector, a.zona)} | עד {a.max_results} עסקים | מייל מהאתר: {'כן' if a.enrich_email else 'לא'}")
    rows = scrape(a.sector, a.zona, a.max_results, a.enrich_email, headless=not a.show_browser)
    if not rows:
        print("[WARN] לא נמצאו עסקים עם טלפון.")
        return
    rows.sort(key=completeness, reverse=True)
    with open(a.output, "w", newline="", encoding="utf-8-sig") as f:  # BOM: Excel opens Hebrew correctly
        w = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, "") for c in COLUMNS})
    print("=" * 40)
    print(f"נמצאו: {len(rows)} | נייד: {sum(bool(r['נייד']) for r in rows)} | נייח: {sum(bool(r['נייח']) for r in rows)} | "
          f"אתר: {sum(bool(r['אתר']) for r in rows)} | מייל: {sum(bool(r['מייל']) for r in rows)}")
    print(f"נשמר: {a.output}  ({datetime.now():%d.%m.%Y %H:%M})")

    # the ideal leads of this run
    import json, pathlib
    hist_path = pathlib.Path(a.history) if a.history else pathlib.Path(a.output).resolve().parent / "leads_history.json"
    history = json.loads(hist_path.read_text("utf-8")) if hist_path.exists() else {}
    leads = pick_leads(rows, a.leads, history)
    if not leads:
        print("[WARN] אין לידים חדשים עם נייד או מייל ברשימה הזו. נסו עוד אזור או סוג עסק, או --enrich-email.")
        return
    md = pathlib.Path(a.output).resolve().parent / f"leads_{datetime.now():%Y-%m-%d_%H%M}.md"
    write_leads(leads, md, a.sender, a.zona, a.sector)
    for r in leads:
        history[r["שם"]] = {"date": f"{datetime.now():%Y-%m-%d}", "phone": r.get("נייד") or r.get("נייח"), "email": r.get("מייל"), "maps": r.get("קישור במפות")}
    hist_path.write_text(json.dumps(history, ensure_ascii=False, indent=1), "utf-8")
    print(f"לידים: {', '.join(r['שם'] for r in leads)}  ->  {md}")


if __name__ == "__main__":
    main()
