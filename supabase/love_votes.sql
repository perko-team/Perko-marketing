-- The neighbourhood love map (getperko.com/love).
-- Residents vote for the local business they love most. Listed businesses (from research/prospects.json) show
-- their name and count at once. A business typed in by hand (key 'x-<hash of the name>') appears once Perko has
-- approved at least one of its votes, and a written reason appears only when its own vote is approved
-- (approved = true, set by hand in the Supabase table editor).
-- Only the service role (the Vercel function /api/love) can read or write: RLS on, no policies, RPCs revoked.

create table if not exists public.love_votes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  business_key text not null check (business_key ~ '^[a-z0-9-]{2,60}$'),
  business_name text not null check (char_length(business_name) between 2 and 60),
  street text check (street in ('emek', 'beitlehem', 'other')),
  reason text check (char_length(reason) <= 140),
  approved boolean not null default false,
  ip_hash text not null
);
alter table public.love_votes enable row level security;
create index if not exists love_votes_key on public.love_votes (business_key);
create index if not exists love_votes_ip_time on public.love_votes (ip_hash, created_at);

-- One vote: at most 5 per visitor (hashed IP) per day.
create or replace function public.love_vote(p_key text, p_name text, p_street text, p_reason text, p_ip text)
returns json language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from love_votes where ip_hash = p_ip and created_at > now() - interval '1 day';
  if n >= 5 then return json_build_object('ok', false, 'error', 'rate_limited'); end if;
  insert into love_votes (business_key, business_name, street, reason, ip_hash)
  values (p_key, p_name, p_street, nullif(trim(p_reason), ''), p_ip);
  return json_build_object('ok', true);
end $$;

-- The public summary: counts per business (hand-typed businesses only once approved), and approved reasons.
create or replace function public.love_summary()
returns json language sql security definer set search_path = public stable as $$
  select json_build_object(
    'businesses', coalesce((
      select json_agg(b order by b.votes desc) from (
        select business_key as key, min(business_name) as name, min(street) as street, count(*) as votes
        from love_votes v
        where v.business_key not like 'x-%'
           or exists (select 1 from love_votes a where a.business_key = v.business_key and a.approved)
        group by business_key
      ) b), '[]'::json),
    'reasons', coalesce((
      select json_agg(r) from (
        select business_name as name, reason from love_votes
        where approved and reason is not null
        order by created_at desc limit 30
      ) r), '[]'::json),
    'total', (select count(*) from love_votes)
  );
$$;

revoke all on function public.love_vote(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.love_summary() from public, anon, authenticated;
grant execute on function public.love_vote(text, text, text, text, text) to service_role;
grant execute on function public.love_summary() to service_role;
