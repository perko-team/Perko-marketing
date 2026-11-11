# Perko Studio

The reels calendar: every daily reel on its day, dragged to another day to change when it publishes, and a data page
(views per reel, formats, time slots, followers, publishing status). Hebrew, RTL, light and dark.

## How it fits together

- **Site** (this folder): Vite, plain TypeScript, two pages (`index.html` calendar, `stats.html` data). Static, deployed
  to its own Vercel project with **Root Directory = `studio`**. `vercel.json` sets the CSP and `noindex`.
- **Backend**: one Supabase Edge Function, `supabase/functions/reels-api`, in the project **perko**. Data is in the
  `reels` schema (not exposed to the REST API), videos and covers in the private Storage bucket `reels`.
- **Publisher**: pg_cron calls `reels-api/cron` every 5 minutes. It starts the next reel whose time has come, checks the
  Instagram container, publishes it, and every 3 hours pulls insights and the follower count.
  A reel whose time passed by more than 3 hours is marked missed and never published late; drag it to a new day.
  The pause button in the Studio stops all publishing.

## Secrets (Supabase > Edge Functions > Secrets)

- `STUDIO_PASSWORD`: the shared password for the Studio.
- `IG_ACCESS_TOKEN`: the Instagram system-user token (`instagram_content_publish`, `instagram_manage_insights`).
- `IG_USER_ID`: the Instagram professional account id of @getperko.

Until both IG values are set, the Studio shows "אינסטגרם לא מחובר" and nothing publishes.

## Adding reels

Render with `video-app/scripts/daily.sh NN`, then from `video-app`:

```bash
REELS_ADMIN_TOKEN=... python3 scripts/sync.py
```

New reels get their time from `content/daily/schedule.json`; times changed in the Studio are kept
(`--reschedule` resets unpublished ones). The admin token is not in the repo; its SHA-256 is in the function.

## Local

```bash
npm install
npm run dev          # http://localhost:5173/?demo uses fixtures in .demo/ (not committed)
npm run build
```
