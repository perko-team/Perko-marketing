# Hooks for the daily reels

What the first second of a Perko reel has to do, and how `content/build.py` checks it. Read before writing new days.

## What is known (and how firmly)

- **Instagram ranks Reels mainly on watch time, likes per reach and sends per reach.** Adam Mosseri named these three in
  January 2025; sends weigh most for reaching people who don't follow us yet. This is the one platform-stated fact here.
  So a reel must hold the first seconds (watch time) and be worth sending to someone (sends).
- **The swipe decision happens in the first one to three seconds.** Every guide agrees; the exact numbers they quote
  (1.7 s, 3 s, "65% decide") have no traceable primary source. Treat the window as real and the percentages as folklore.
- **Many people watch muted.** The hook has to work as on-screen text alone, and the spoken line has to say the same
  thing as the text, so sound-on and sound-off viewers get the same hook.
- **Our own data decides.** The Studio's data page compares formats and time slots; every spec carries `hookType` so
  hook types can be compared the same way once there are enough published reels. Change one thing at a time.

## Rules the template and the content follow

1. **The hook is fully on screen on frame 0.** No letter-by-letter reveal for the hook (the items keep theirs). It lands
   with a punch-in and an impact sound; the human line follows within a tenth of a second. (`DailyReel.tsx`, Hook)
2. **No runway.** No greeting, no logo, no "today I'll show you". The wordmark is the last scene, never the first.
3. **Short.** The hook (big words) is 1-4 words; hook + accent, spoken, is at most 10 words (about 3 seconds).
4. **Concrete.** A named situation, object or number from the viewer's day ("שקט בעסק היום?", "עשר כרטיסיות בארנק"),
   never a vague promise ("טיפ שישנה לכם את העסק").
5. **The payoff matches the promise.** If the hook says three things, there are three items. No bait-and-switch, no
   "watch to the end".
6. **No invented proof.** No statistics, studies or customers that don't exist. Numbers in hooks count things in the reel
   (three tips) or describe a scene (ten cards in a wallet), never results.
7. **Re-hook.** The item counter (01/03) keeps an open loop; each item title is itself a short line that could stand alone.
8. **Ask for the send.** Half the reels close on "send this to a business owner" (sends per reach), the other half on
   the early-access call. Captions end with a question.

## Hook types we use (`hookType` in each spec)

- `list`: a count of what follows. "3 דברים / שגורמים ללקוח לחזור מחר."
- `symptom`: names a moment the viewer is in right now. "שקט בעסק היום?"
- `mistake`: a common error and its cost. "הטעות בכרטיסייה / שגורמת ללקוחות לוותר באמצע."
- `stop`: a pattern interrupt that blocks a habit. "עצרו. / לפני עוד שקל על פרסום."
- `quiz`: myth or fact, red flag or green flag; the viewer answers before the reel does.
- `pov`: the "nobody: / the owner at 8 am:" meme frame, relatable and shareable.
- `relatable`: a scene from the customer's side. "עשר כרטיסיות בארנק / ואף אחת לא מלאה."
- `incomplete`: a sentence that the items finish. "לקוח קבוע / זה כש..."

Avoid: questions answerable with "no" and a swipe ("רוצים עוד לקוחות?"), hooks about Perko instead of the viewer,
claims the items do not back up.

## Sources

- Mosseri on the three signals, as reported: [Buffer](https://buffer.com/resources/instagram-algorithms/),
  [Socialinsider](https://socialinsider.io/blog/instagram-reels-algorithm/)
- Hook timing, sound-off text, matching spoken and on-screen hook, hook types:
  [Kompozy guide](https://kompozy.io/guides/short-form-video-hooks),
  [Terra Market Group, 30 opening patterns](https://www.terramarketgroup.com/blog/short-form-video-retention-hooks-2026-30-tested-opening-patterns-for-reels-tiktok-and-shorts)
- On the weak sourcing of the popular percentages: [go-viral.app](https://www.go-viral.app/blog/hook-first-3-seconds/),
  [grow-it.se benchmarks](https://www.grow-it.se/en/resources/short-form-video-retention-benchmarks) (vendor data, directional)
