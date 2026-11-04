// Vercel Function: /api/race. "The race for the golden card", an Instagram referral game (getperko.com/race).
//   POST  join, called only by the DM tool (ManyChat "External Request") with the shared secret:
//         Authorization: Bearer <RACE_SECRET>
//         { "id": "<ManyChat contact id>", "username": "<instagram username>", "name": "<first name>", "ref": "<inviter's code or empty>" }
//         -> { ok, new, code, name, stamps, link }  (link = the player's personal page)
//   GET   ?code=abc123  one card (first name and stamps), for getperko.com/r/abc123
//   GET   the public board: top 10, first names only
// Storage: race_players in Supabase (supabase/race.sql), reached only through its RPCs with the service role key.
// Environment (Vercel > Project > Settings > Environment Variables):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RACE_SECRET (a long random string, also pasted into ManyChat)
//   RACE_OPEN  "1" while the game runs; anything else and new joins get { ok: false, error: "closed" }

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

const text = (v: unknown, max: number) =>
  typeof v === 'string' || typeof v === 'number'
    ? String(v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
    : '';
const CODE = /^[0-9a-f]{6}$/;

function sameSecret(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function GET(request: Request): Promise<Response> {
  if (!env()) return json(503, { error: 'not_configured' });
  const code = new URL(request.url).searchParams.get('code');
  try {
    if (code !== null) {
      if (!CODE.test(code)) return json(404, { error: 'not_found' });
      const card = await rpc('race_card', { p_code: code });
      return card ? json(200, card, 'public, max-age=0, s-maxage=20') : json(404, { error: 'not_found' });
    }
    return json(200, await rpc('race_board', {}), 'public, max-age=0, s-maxage=30');
  } catch (err) {
    console.error(err);
    return json(502, { error: 'upstream' });
  }
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.RACE_SECRET || '';
  if (!env() || secret.length < 24) return json(503, { error: 'not_configured' });
  const auth = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!sameSecret(auth, secret)) return json(401, { error: 'unauthorized' });
  if (process.env.RACE_OPEN !== '1') return json(200, { ok: false, error: 'closed' });

  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return json(400, { error: 'bad_json' });
  }
  const id = text(raw.id, 64);
  const username = text(raw.username, 64).replace(/^@/, '');
  const name = text(raw.name, 30) || username.slice(0, 30);
  // ManyChat sends a ref URL payload as "r_<code>"; accept either form.
  const ref = text(raw.ref, 20).toLowerCase().replace(/^r_/, '');
  if (!id || !name) return json(400, { error: 'invalid' });

  try {
    const r = await rpc('race_join', { p_ig_id: id, p_username: username, p_name: name, p_ref: CODE.test(ref) ? ref : null });
    const origin = new URL(request.url).origin;
    return json(200, { ...r, link: `${origin}/r/${r.code}` });
  } catch (err) {
    console.error(err);
    return json(502, { error: 'upstream' });
  }
}
