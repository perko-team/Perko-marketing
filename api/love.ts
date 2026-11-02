// Vercel Function: /api/love. The neighbourhood love map (getperko.com/love).
//   GET   the public summary: votes per business and the reasons Perko approved.
//   POST  one vote: { key, name?, reason?, website } where key is a listed business or "other" with a typed name.
// Storage: the love_votes table in Supabase (supabase/love_votes.sql), reached only through its two RPCs
// with the service role key, which never leaves this function.
// Environment (Vercel > Project > Settings > Environment Variables):
//   SUPABASE_URL               https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  the project's service_role key
//   LOVE_SALT                  optional, any long random string, mixed into the hashed IP
import { createHash } from 'node:crypto';
import listed from '../src/data/love-businesses.json';

const json = (status: number, body: unknown, cache = 'no-store') =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });

function env() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ''), key } : null;
}

async function rpc(fn: string, args: Record<string, unknown>) {
  const e = env()!;
  const res = await fetch(`${e.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: e.key, Authorization: `Bearer ${e.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`${fn} ${res.status} ${await res.text().catch(() => '')}`);
  return res.json();
}

const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max + 1) : '';

export async function GET(): Promise<Response> {
  if (!env()) return json(503, { error: 'not_configured' });
  try {
    return json(200, await rpc('love_summary', {}), 'public, max-age=0, s-maxage=30');
  } catch (err) {
    console.error(err);
    return json(502, { error: 'upstream' });
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!env()) return json(503, { error: 'not_configured' });
  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return json(400, { error: 'bad_json' });
  }
  if (typeof raw.website === 'string' && raw.website) return json(200, { ok: true }); // spam trap

  const reason = clean(raw.reason, 140);
  if (reason.length > 140) return json(400, { error: 'too_long' });

  let key: string, name: string, street: string;
  const hit = listed.find((b) => b.key === raw.key);
  if (hit) {
    ({ key, name, street } = hit);
  } else if (raw.key === 'other') {
    name = clean(raw.name, 60);
    if (name.length < 2 || name.length > 60) return json(400, { error: 'invalid_name' });
    // Same business typed twice lands on the same key: lower case, no spaces or punctuation.
    const norm = name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    key = 'x-' + createHash('sha256').update(norm).digest('hex').slice(0, 16);
    street = 'other';
  } else {
    return json(400, { error: 'invalid_key' });
  }

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const ipHash = createHash('sha256').update(`${process.env.LOVE_SALT || 'perko-love'}:${ip}`).digest('hex').slice(0, 32);

  try {
    const r = await rpc('love_vote', { p_key: key, p_name: name, p_street: street, p_reason: reason, p_ip: ipHash });
    if (!r?.ok) return json(429, { error: r?.error || 'rejected' });
    return json(200, { ok: true, key, pending: key.startsWith('x-') || !!reason });
  } catch (err) {
    console.error(err);
    return json(502, { error: 'upstream' });
  }
}
