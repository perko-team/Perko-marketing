# Perko - app promo (real screenshots, Motion DNA)

16:9, 1920×1080, 30 fps, 22.0 s, 120 BPM (beat 0.5 s, bar 2.0 s, one scene per bar). Hebrew, RTL, no English except
the logo. Scenes are written in story frames (12 per beat, 48 per bar) and stretched by `SLOW = 1.25` in
`src/tokens.ts`, the same pace as the slowed first promo in `../video`. Sources and decisions: `PROJECT_BRIEF.md`.

```sh
ln -s ../video/node_modules node_modules   # or: npm install
python3 music/compose.py                   # original score -> public/music.wav (numpy + scipy)
npm run render                             # out/perko-app-promo.mp4
```

Screenshots come from the real app (Perko-app, demo mode). To refresh them: in Perko-app run
`npx expo export --platform web`, serve the output as a SPA on port 8089, then `node scripts/capture-shots.cjs`
and `node scripts/capture-redeem.cjs` (Playwright).

## Beat sheet (real time)

1. 0.0-2.0 Boot, ink. Spark → dot, `פרקו // ארנק` rewritten to `פרקו / האפליקציה - 2026`, line → flash.
2. 2.0-4.0 Title, lime. "perk" + disc, accent "כל הכרטיסים, בארנק אחד". Exit: the disc → ink mask on the drop (4.0 s).
3. 4.0-6.0 Wallet, ink. Phone snaps up with the card stack; a tap lands on the top card. Exit: the lime tap dot opens.
4. 6.0-8.0 Swipe, lime. The focused card; on beat 2 a sideways swipe to the next card (only the card strip moves,
   the page dots update). Exit: diagonal slab wipe.
5. 8.0-10.0 Discover, paper. Phone whips in; a tap on "הוספה". Exit: column dissolve to ink.
6. 10.0-12.0 Kinetic: "סורקים" ink · "צוברים" lime · "ומממשים." paper + underline. Exit: the underline → ink band.
7. 12.0-14.0 Scan, ink. The result sheet snaps up, "הכרטיס מלא"; a lime ring locks on the tenth stamp. Exit: radial burst.
8. 14.0-16.0 Redeem, lime. The code changes (glitch slices, real second capture). Exit: the phone collapses to an ink dot → portal rings.
9. 16.0-18.0 Kinetic: "הלקוחות" paper · "חוזרים." lime · "והעסק נשאר בתודעה" ink with a lime period. Exit: the period grows.
10. 18.0-22.0 End, lime. The dot writes the wordmark, "הצטרפו בחינם לגישה המוקדמת", button, pilot tagline decodes, credit line.

## Audio

Original score (`music/compose.py`, a new piece in G major, seeded): pad and bell intro, light groove under the title,
riser and dip, the drop on the title exit at 4.0 s, full groove under the product scenes, the groove stops at 18.0 s
for the end card, bells for the wordmark. Mix measured on the render: -16.3 LUFS, -3.0 dBFS peak.

## Voiceover script (not recorded yet; each line starts on a scene downbeat)

- 2.0 s: פרקו. כל הכרטיסים, בארנק אחד.
- 4.0 s: מחליקים בין הכרטיסים, כמו בארנק של הטלפון.
- 8.0 s: מגלים עסקים בשכונה.
- 10.0 s: סורקים בקופה, צוברים, ומממשים.
- 14.0 s: עם קוד שמתחלף כל שלושים שניות.
- 16.0 s: הלקוחות חוזרים, והעסק נשאר בתודעה.
- 18.5 s: פרקו. הצטרפו בחינם לגישה המוקדמת.

When a take exists, place it as in `../video` (cut at its pauses, each line on its beat, voice above the bed).

## Daily reels: render, calendar, publish

```bash
pip install scipy && python3 music/daily.py   # once: the four music loops (public/daily/, not committed)
bash scripts/daily.sh 01                      # day 1: out/daily/day01-{a,b}.mp4 + covers
python3 scripts/dashboard.py                  # out/daily/dashboard.html: the calendar, covers, captions, status
python3 scripts/publish.py check              # read-only: token, account, publishing quota
python3 scripts/publish.py publish day01-a    # dry run; add --yes to publish
python3 scripts/publish.py due --yes          # publish the next reel whose slot has passed (one per run)
```

The schedule lives in `content/daily/schedule.json` (start date, a time per slot, Saturday skipped).
Publishing needs `IG_ACCESS_TOKEN` (system user token with `instagram_content_publish`) and `IG_USER_ID`.
Videos go up as resumable uploads, so no public URL is needed. Each publish is logged in
`content/daily/published.json`, and a reel that is already logged is never sent again.
