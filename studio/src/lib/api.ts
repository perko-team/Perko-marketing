// The Studio talks to one Supabase Edge Function, reels-api. The session is a signed token from POST /login.
const API = import.meta.env.VITE_REELS_API ?? 'https://fmfgpwdjmkllslzxsmyy.supabase.co/functions/v1/reels-api';
const KEY = 'perko-studio-session';
// `npm run dev` with ?demo reads fixtures from studio/.demo/ (not committed), so the screens can be checked without a login
export const DEMO = import.meta.env.DEV && new URLSearchParams(location.search).has('demo');

export type Status = 'scheduled' | 'processing' | 'published' | 'failed' | 'missed';
export interface Spec {
  id: string; format: 'tips' | 'myth' | 'pov' | 'flags'; topic: string; hook: string; hookAccent: string;
  items: { title: string; body?: string; tag?: string }[]; cta: { big: string; accent: string; mono: string };
  caption: string; hashtags: string[]; music: number;
}
export interface Reel {
  id: string; spec: Spec; scheduled_at: string; status: Status; has_video: boolean;
  cover_url: string | null; permalink: string | null; published_at: string | null; error: string | null;
}
export interface ReelsResponse { reels: Reel[]; paused: boolean; ig_ready: boolean; now: string }
export interface StatRow {
  id: string; format: Spec['format']; slot: string; status: Status; published_at: string | null; hook: string;
  views: number | null; reach: number | null; likes: number | null; comments: number | null; saved: number | null; shares: number | null;
  total_interactions: number | null; insights_day: string | null;
}
export interface StatsResponse { reels: StatRow[]; followers: { day: string; followers: number | null }[]; events: { at: string; reel_id: string | null; event: string; detail: string | null }[]; now: string }

export class ApiError extends Error { constructor(public status: number, public code: string) { super(code); } }

const token = () => { try { const s = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return s && s.exp > Date.now() ? (s.token as string) : null; } catch { return null; } };
export const signedIn = () => DEMO || !!token();
export const signOut = () => { try { localStorage.removeItem(KEY); } catch { /* storage blocked */ } };

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (DEMO) return demo<T>(path, init);
  const t = token();
  const r = await fetch(API + path, { ...init, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(init.headers ?? {}) } });
  const body = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== '/login') { signOut(); location.reload(); }
  if (!r.ok) throw new ApiError(r.status, body.error ?? 'error');
  return body as T;
}

export async function signIn(password: string) {
  const r = await call<{ token: string; exp: number }>('/login', { method: 'POST', body: JSON.stringify({ password }) });
  try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* storage blocked: the session lasts this page only */ }
}
export const getReels = () => call<ReelsResponse>('/reels');
export const getStats = () => call<StatsResponse>('/stats');
export const moveReel = (id: string, scheduled_at: string) => call<{ id: string; scheduled_at: string; status: Status }>(`/reels/${id}`, { method: 'PATCH', body: JSON.stringify({ scheduled_at }) });
export const videoUrl = (id: string) => call<{ url: string | null }>(`/reels/${id}/video`);
export const setPaused = (paused: boolean) => call<{ paused: boolean }>('/settings', { method: 'POST', body: JSON.stringify({ paused }) });

// ---- demo fixtures (dev only) ----
const demoState: { reels?: ReelsResponse } = {};
async function demo<T>(path: string, init: RequestInit): Promise<T> {
  await new Promise((r) => setTimeout(r, 120));
  if (path === '/reels') { demoState.reels ??= await (await fetch('/.demo/reels.json')).json(); return structuredClone(demoState.reels) as T; }
  if (path === '/stats') return (await (await fetch('/.demo/stats.json')).json()) as T;
  if (path.endsWith('/video')) return { url: null } as T;
  if (path === '/settings') { const { paused } = JSON.parse(String(init.body)); demoState.reels!.paused = paused; return { paused } as T; }
  if (init.method === 'PATCH') {
    const id = path.split('/')[2]; const { scheduled_at } = JSON.parse(String(init.body));
    if (Date.parse(scheduled_at) < Date.now() + 5 * 60e3) throw new ApiError(409, 'in_the_past');
    const r = demoState.reels!.reels.find((x) => x.id === id)!;
    if (!['scheduled', 'missed', 'failed'].includes(r.status)) throw new ApiError(409, 'locked');
    Object.assign(r, { scheduled_at, status: 'scheduled', error: null });
    return { id, scheduled_at, status: 'scheduled' } as T;
  }
  throw new ApiError(404, 'not_found');
}
