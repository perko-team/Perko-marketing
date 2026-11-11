// reels-api: the backend of Perko Studio (the reels calendar) and the Instagram publisher.
// Deployed to the Supabase project "perko" with verify_jwt off; it does its own auth:
//   studio routes   Authorization: Bearer <session>   (session from POST /login with STUDIO_PASSWORD)
//   admin routes    x-reels-admin: <admin token>       (its SHA-256 is ADMIN_SHA256 below; pg_cron sends it from Vault)
// Data lives in the "reels" schema (not exposed to the REST API) and the private Storage bucket "reels".
// Secrets (Edge Functions > Secrets): STUDIO_PASSWORD, IG_ACCESS_TOKEN, IG_USER_ID.
import postgres from 'npm:postgres@3.4.5';

const ADMIN_SHA256 = Deno.env.get('REELS_ADMIN_SHA256') ?? '81006ad9716200a24ec11faa0224fecba4dbd91375af1d672300141b9b19ca94';
const SB = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GRAPH = 'https://graph.facebook.com/v21.0';
const BUCKET = 'reels';
const TZ = 'Asia/Jerusalem';
const MISS_AFTER_MIN = 180;      // a reel whose time passed by this much is marked missed, never published late
const MIN_LEAD_MIN = 5;          // a reel can be moved to no earlier than now + this
const PROCESS_TIMEOUT_MIN = 60;  // a container still processing after this is marked failed
const INSIGHTS_EVERY_MIN = 180;

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 2, prepare: false, ssl: false });

const SCHEMA = `
create schema if not exists reels;
revoke all on schema reels from anon, authenticated;
create table if not exists reels.reels (
  id text primary key,
  spec jsonb not null,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','processing','published','failed','missed')),
  video_path text, cover_path text,
  container_id text, media_id text, permalink text,
  started_at timestamptz, published_at timestamptz, error text,
  updated_at timestamptz not null default now()
);
create table if not exists reels.insights (
  reel_id text references reels.reels(id) on delete cascade,
  day date not null,
  views int, reach int, likes int, comments int, saved int, shares int, total_interactions int,
  fetched_at timestamptz not null default now(),
  primary key (reel_id, day)
);
create table if not exists reels.account_daily (day date primary key, followers int, media_count int, fetched_at timestamptz not null default now());
create table if not exists reels.settings (key text primary key, value jsonb not null);
create table if not exists reels.log (id bigserial primary key, at timestamptz not null default now(), reel_id text, event text not null, detail text);
create index if not exists reels_due on reels.reels (status, scheduled_at);
alter table reels.reels enable row level security;
alter table reels.insights enable row level security;
alter table reels.account_daily enable row level security;
alter table reels.settings enable row level security;
alter table reels.log enable row level security;
insert into reels.settings values ('paused', 'false'::jsonb) on conflict do nothing;
create extension if not exists pg_cron;
create extension if not exists pg_net;
`;

// ---------- helpers ----------
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-reels-admin',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const enc = new TextEncoder();
const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sha256 = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))).map((x) => x.toString(16).padStart(2, '0')).join('');
const hmacKey = crypto.subtle.importKey('raw', enc.encode('reels-session:' + SERVICE), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
const sign = async (s: string) => b64u(await crypto.subtle.sign('HMAC', await hmacKey, enc.encode(s)));
const same = async (a: string, b: string) => (await sign('cmp:' + a)) === (await sign('cmp:' + b)); // constant-time enough: compares HMACs

async function session(exp: number) { const p = b64u(enc.encode(JSON.stringify({ exp }))); return `${p}.${await sign(p)}`; }
async function authed(req: Request) {
  const t = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  const [p, s] = t.split('.');
  if (!p || !s || !(await same(s, await sign(p)))) return false;
  try { return JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/'))).exp > Date.now(); } catch { return false; }
}
async function isAdmin(req: Request) { const t = req.headers.get('x-reels-admin'); return !!t && (await sha256(t)) === ADMIN_SHA256; }
const log = (reel_id: string | null, event: string, detail = '') => sql`insert into reels.log (reel_id, event, detail) values (${reel_id}, ${event}, ${detail.slice(0, 2000)})`;
const setting = async (key: string) => (await sql`select value from reels.settings where key = ${key}`)[0]?.value;
const setSetting = (key: string, value: unknown) => sql`insert into reels.settings values (${key}, ${sql.json(value as any)}) on conflict (key) do update set value = excluded.value`;

// ---------- storage ----------
const storage = (path: string, init: RequestInit = {}) =>
  fetch(`${SB}/storage/v1${path}`, { ...init, headers: { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
async function signMany(paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const r = await storage(`/object/sign/${BUCKET}`, { method: 'POST', body: JSON.stringify({ expiresIn, paths }) });
  const out: Record<string, string> = {};
  if (r.ok) for (const x of await r.json()) if (x.signedURL) out[x.path] = `${SB}/storage/v1${x.signedURL}`;
  return out;
}
async function signUpload(path: string) {
  const r = await storage(`/object/upload/sign/${BUCKET}/${path}`, { method: 'POST', headers: { 'x-upsert': 'true' } });
  if (!r.ok) throw new Error(`sign upload ${path}: ${r.status} ${await r.text()}`);
  return `${SB}/storage/v1${(await r.json()).url}`;
}

// ---------- instagram ----------
async function ig(method: 'GET' | 'POST', path: string, params: Record<string, string> = {}) {
  const token = Deno.env.get('IG_ACCESS_TOKEN');
  if (!token) throw new Error('IG_ACCESS_TOKEN is not set');
  const q = new URLSearchParams({ ...params, access_token: token });
  const r = method === 'GET' ? await fetch(`${GRAPH}/${path}?${q}`) : await fetch(`${GRAPH}/${path}`, { method, body: q });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new Error(`${path.split('?')[0]}: ${body.error?.message ?? r.status} (code ${body.error?.code ?? '-'})`);
  return body;
}
const caption = (spec: any) => `${String(spec.caption).trim()}\n\n${(spec.hashtags ?? []).join(' ')}`;
const localDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

// ---------- the publisher tick (pg_cron, every 5 minutes) ----------
async function tick() {
  const out: string[] = [];
  const igUser = Deno.env.get('IG_USER_ID');
  // 1. reels whose time passed long ago are missed, never published late
  const missed = await sql`update reels.reels set status = 'missed', updated_at = now(), error = 'the time passed before it could be published'
    where status = 'scheduled' and scheduled_at < now() - make_interval(mins => ${MISS_AFTER_MIN}) returning id`;
  for (const m of missed) { out.push(`missed ${m.id}`); await log(m.id, 'missed'); }
  if (!igUser || !Deno.env.get('IG_ACCESS_TOKEN')) return [...out, 'instagram not configured'];

  // 2. advance the one in processing
  const [proc] = await sql`select * from reels.reels where status = 'processing' order by started_at limit 1`;
  if (proc) {
    try {
      const st = await ig('GET', proc.container_id, { fields: 'status_code,status' });
      if (st.status_code === 'FINISHED') {
        const { id } = await ig('POST', `${igUser}/media_publish`, { creation_id: proc.container_id });
        const { permalink } = await ig('GET', id, { fields: 'permalink' });
        await sql`update reels.reels set status = 'published', media_id = ${id}, permalink = ${permalink ?? null}, published_at = now(), error = null, updated_at = now() where id = ${proc.id}`;
        await log(proc.id, 'published', permalink ?? id); out.push(`published ${proc.id}`);
      } else if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED' || Date.now() - new Date(proc.started_at).getTime() > PROCESS_TIMEOUT_MIN * 60e3) {
        throw new Error(`container ${st.status_code}: ${st.status ?? 'timed out'}`);
      } else out.push(`processing ${proc.id} ${st.status_code}`);
    } catch (e) {
      await sql`update reels.reels set status = 'failed', error = ${String(e)}, updated_at = now() where id = ${proc.id}`;
      await log(proc.id, 'failed', String(e)); out.push(`failed ${proc.id}`);
    }
  } else if ((await setting('paused')) !== true) {
    // 3. start the next due reel (one at a time)
    const [due] = await sql`update reels.reels set status = 'processing', started_at = now(), updated_at = now()
      where id = (select id from reels.reels where status = 'scheduled' and scheduled_at <= now() and video_path is not null
                  order by scheduled_at limit 1 for update skip locked) returning *`;
    if (due) {
      try {
        const urls = await signMany([due.video_path, due.cover_path].filter(Boolean), 7200);
        const p: Record<string, string> = { media_type: 'REELS', video_url: urls[due.video_path], caption: caption(due.spec), share_to_feed: 'true' };
        if (due.cover_path && urls[due.cover_path]) p.cover_url = urls[due.cover_path]; else p.thumb_offset = '1333';
        const { id } = await ig('POST', `${igUser}/media`, p);
        await sql`update reels.reels set container_id = ${id} where id = ${due.id}`;
        await log(due.id, 'container', id); out.push(`started ${due.id}`);
      } catch (e) {
        await sql`update reels.reels set status = 'failed', error = ${String(e)}, updated_at = now() where id = ${due.id}`;
        await log(due.id, 'failed', String(e)); out.push(`failed ${due.id}`);
      }
    }
  } else out.push('paused');

  // 4. insights, every few hours
  const last = await setting('last_insights');
  if (!last || Date.now() - Date.parse(last) > INSIGHTS_EVERY_MIN * 60e3) {
    await setSetting('last_insights', new Date().toISOString());
    try {
      const acc = await ig('GET', igUser, { fields: 'followers_count,media_count' });
      await sql`insert into reels.account_daily (day, followers, media_count) values (${localDay()}, ${acc.followers_count ?? null}, ${acc.media_count ?? null})
        on conflict (day) do update set followers = excluded.followers, media_count = excluded.media_count, fetched_at = now()`;
      const pub = await sql`select id, media_id from reels.reels where status = 'published' and published_at > now() - interval '60 days'`;
      for (const r of pub) {
        try {
          const ins = await ig('GET', `${r.media_id}/insights`, { metric: 'views,reach,likes,comments,saved,shares,total_interactions' });
          const v: Record<string, number> = {};
          for (const m of ins.data ?? []) v[m.name] = m.values?.[0]?.value ?? m.total_value?.value ?? 0;
          await sql`insert into reels.insights (reel_id, day, views, reach, likes, comments, saved, shares, total_interactions)
            values (${r.id}, ${localDay()}, ${v.views ?? null}, ${v.reach ?? null}, ${v.likes ?? null}, ${v.comments ?? null}, ${v.saved ?? null}, ${v.shares ?? null}, ${v.total_interactions ?? null})
            on conflict (reel_id, day) do update set views = excluded.views, reach = excluded.reach, likes = excluded.likes, comments = excluded.comments,
              saved = excluded.saved, shares = excluded.shares, total_interactions = excluded.total_interactions, fetched_at = now()`;
        } catch (e) { await log(r.id, 'insights_failed', String(e)); }
      }
      out.push(`insights ${pub.length}`);
    } catch (e) { await log(null, 'insights_failed', String(e)); out.push('insights failed'); }
  }
  return out;
}

// ---------- routes ----------
async function listReels() {
  const rows = await sql`select id, spec, scheduled_at, status, cover_path, video_path is not null as has_video, permalink, published_at, error from reels.reels order by scheduled_at`;
  const covers = await signMany(rows.map((r) => r.cover_path).filter(Boolean), 6 * 3600);
  return rows.map(({ cover_path, ...r }) => ({ ...r, cover_url: cover_path ? covers[cover_path] ?? null : null }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const path = new URL(req.url).pathname.replace(/^.*?\/reels-api/, '') || '/';
  try {
    // ---- admin ----
    if (path.startsWith('/admin/') || path === '/cron') {
      if (!(await isAdmin(req))) return json(401, { error: 'unauthorized' });
      if (path === '/cron') return json(200, { ok: true, did: await tick() });
      if (path === '/admin/setup') {
        await sql.unsafe(SCHEMA);
        const b = await storage('/bucket', { method: 'POST', body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: 104857600 }) });
        const token = req.headers.get('x-reels-admin')!;
        const [v] = await sql`select id from vault.secrets where name = 'reels_admin_token'`;
        if (v) await sql`select vault.update_secret(${v.id}, ${token})`; else await sql`select vault.create_secret(${token}, 'reels_admin_token')`;
        await sql`select cron.unschedule(jobid) from cron.job where jobname = 'reels-tick'`;
        await sql.unsafe(`select cron.schedule('reels-tick', '*/5 * * * *', $job$
          select net.http_post(url := '${SB}/functions/v1/reels-api/cron',
            headers := jsonb_build_object('Content-Type', 'application/json',
              'x-reels-admin', (select decrypted_secret from vault.decrypted_secrets where name = 'reels_admin_token')),
            body := '{}'::jsonb, timeout_milliseconds := 120000) $job$)`);
        return json(200, { ok: true, bucket: b.status });
      }
      if (path === '/admin/sync' && req.method === 'POST') {
        // body: { reels: [{ id, spec, scheduled_at }], reschedule?: boolean, upload?: string[] }
        const body = await req.json();
        const res: Record<string, unknown> = {};
        for (const r of body.reels ?? []) {
          const vp = `${r.id}.mp4`, cp = `${r.id}-cover.jpg`;
          const [row] = await sql`insert into reels.reels (id, spec, scheduled_at) values (${r.id}, ${sql.json(r.spec)}, ${r.scheduled_at})
            on conflict (id) do update set spec = excluded.spec,
              scheduled_at = case when ${!!body.reschedule} and reels.reels.status = 'scheduled' then excluded.scheduled_at else reels.reels.scheduled_at end,
              updated_at = now()
            returning id, status, scheduled_at, video_path, cover_path`;
          const want = (body.upload ?? []).includes(r.id);
          res[r.id] = {
            status: row.status, scheduled_at: row.scheduled_at,
            ...(want ? { video_upload: await signUpload(vp), cover_upload: await signUpload(cp) } : {}),
          };
        }
        return json(200, { ok: true, reels: res });
      }
      if (path === '/admin/uploaded' && req.method === 'POST') {
        const { id } = await req.json();
        await sql`update reels.reels set video_path = ${id + '.mp4'}, cover_path = ${id + '-cover.jpg'}, updated_at = now() where id = ${id}`;
        return json(200, { ok: true });
      }
      if (path === '/admin/check') {
        const me = await ig('GET', 'me', { fields: 'id,name' });
        const igUser = Deno.env.get('IG_USER_ID');
        const acc = igUser ? await ig('GET', igUser, { fields: 'username,followers_count,media_count' }) : null;
        const lim = igUser ? await ig('GET', `${igUser}/content_publishing_limit`, { fields: 'quota_usage,config' }) : null;
        return json(200, { me, account: acc, limit: lim });
      }
      return json(404, { error: 'not_found' });
    }

    // ---- studio ----
    if (path === '/login' && req.method === 'POST') {
      const pw = Deno.env.get('STUDIO_PASSWORD');
      if (!pw) return json(503, { error: 'not_configured' });
      const [{ n }] = await sql`select count(*)::int as n from reels.log where event = 'login_failed' and at > now() - interval '15 minutes'`;
      if (n >= 20) return json(429, { error: 'too_many_attempts' });
      const { password } = await req.json().catch(() => ({}));
      if (typeof password !== 'string' || !(await same(password, pw))) {
        await log(null, 'login_failed'); await new Promise((r) => setTimeout(r, 800));
        return json(401, { error: 'wrong_password' });
      }
      const exp = Date.now() + 14 * 864e5;
      return json(200, { token: await session(exp), exp });
    }
    if (!(await authed(req))) return json(401, { error: 'unauthorized' });

    if (path === '/reels' && req.method === 'GET') {
      return json(200, { reels: await listReels(), paused: (await setting('paused')) === true, ig_ready: !!(Deno.env.get('IG_USER_ID') && Deno.env.get('IG_ACCESS_TOKEN')), now: new Date().toISOString() });
    }
    const m = path.match(/^\/reels\/([\w-]+)(\/video)?$/);
    if (m && m[2] && req.method === 'GET') {
      const [r] = await sql`select video_path from reels.reels where id = ${m[1]}`;
      if (!r?.video_path) return json(404, { error: 'no_video' });
      return json(200, { url: (await signMany([r.video_path], 3600))[r.video_path] ?? null });
    }
    if (m && !m[2] && req.method === 'PATCH') {
      const { scheduled_at } = await req.json();
      const t = Date.parse(scheduled_at);
      if (!Number.isFinite(t)) return json(400, { error: 'bad_time' });
      if (t < Date.now() + MIN_LEAD_MIN * 60e3) return json(409, { error: 'in_the_past' });
      const [r] = await sql`update reels.reels set scheduled_at = ${new Date(t).toISOString()}, status = 'scheduled', error = null, updated_at = now()
        where id = ${m[1]} and status in ('scheduled', 'missed', 'failed') returning id, scheduled_at, status`;
      if (!r) return json(409, { error: 'locked' });
      await log(r.id, 'moved', r.scheduled_at.toISOString());
      return json(200, r);
    }
    if (path === '/settings' && req.method === 'POST') {
      const { paused } = await req.json();
      await setSetting('paused', !!paused); await log(null, paused ? 'paused' : 'resumed');
      return json(200, { paused: !!paused });
    }
    if (path === '/stats' && req.method === 'GET') {
      const reels = await sql`select r.id, r.spec->>'format' as format, to_char(r.scheduled_at at time zone ${TZ}, 'HH24:MI') as slot, r.status, r.published_at, r.spec->>'hook' as hook,
          i.views, i.reach, i.likes, i.comments, i.saved, i.shares, i.total_interactions, i.day as insights_day
        from reels.reels r left join lateral (select * from reels.insights x where x.reel_id = r.id order by day desc limit 1) i on true
        order by r.scheduled_at`;
      const followers = await sql`select day, followers from reels.account_daily order by day`;
      const events = await sql`select at, reel_id, event, detail from reels.log where event <> 'login_failed' order by at desc limit 12`;
      return json(200, { reels, followers, events, now: new Date().toISOString() });
    }
    return json(404, { error: 'not_found' });
  } catch (e) {
    console.error(e);
    return json(500, { error: 'server_error', detail: String(e).slice(0, 300) });
  }
});
