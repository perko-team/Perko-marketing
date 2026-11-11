# Daily reels: publishing

- `ig_publish.py` - checks and publishes one reel to Instagram (Graph API, resumable upload, no public URL needed).
  Modes: `check` (default, sends nothing), `stage` (uploads a container, does not publish), `publish --yes`.
  Needs `IG_ACCESS_TOKEN`; `IG_USER_ID` optional (found through the token's Pages).
- `schedule.py` - builds the calendar rows for a week (slot a 12:30, slot b 19:30, Israel time).
- `dashboard.html` - the calendar page (claude.ai artifact, rows in its `reels` collection, status in `meta/status`).
  Live at https://claude.ai/artifact/YYhivEfyednvXukwYVapnf
- `assets-week1.json` - the uploaded video and cover URLs for week 1, inside that artifact.

Flow: `scripts/daily.sh NN` renders -> upload the mp4 + cover to the artifact -> `schedule.py` -> write the rows.
The daily publisher (not active yet) reads due `scheduled` rows, runs `ig_publish.py --mode publish --yes`,
and writes back `status` (`published` / `failed`), `permalink` and `error`.
