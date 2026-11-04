-- "The race for the golden card" (getperko.com/race): an Instagram referral game.
-- A player joins by commenting on the Perko post; the DM tool (ManyChat) calls /api/race, which calls race_join.
-- Every new player who arrived through another player's link gives that player one stamp. First to 10 wins.
-- Only the service role (the Vercel function) can reach this: RLS on with no policies, RPCs revoked from the API roles.

create table if not exists public.race_players (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ig_id text not null unique check (char_length(ig_id) between 1 and 64),
  ig_username text check (char_length(ig_username) <= 64),
  first_name text not null check (char_length(first_name) between 1 and 30),
  code text not null unique check (code ~ '^[a-z0-9]{6}$'),
  referred_by bigint references public.race_players (id),
  stamps int not null default 0 check (stamps between 0 and 10),
  last_stamp_at timestamptz,
  completed_at timestamptz,
  disqualified boolean not null default false
);
alter table public.race_players enable row level security;
create index if not exists race_players_board on public.race_players (stamps desc, last_stamp_at) where not disqualified;

-- Join (idempotent per Instagram account). Returns the player's code, name and stamps.
create or replace function public.race_join(p_ig_id text, p_username text, p_name text, p_ref text)
returns json language plpgsql security definer set search_path = public as $$
declare me race_players; ref race_players; c text; tries int := 0;
begin
  select * into me from race_players where ig_id = p_ig_id;
  if found then
    return json_build_object('ok', true, 'new', false, 'code', me.code, 'name', me.first_name, 'stamps', me.stamps);
  end if;
  if p_ref is not null and p_ref ~ '^[a-z0-9]{6}$' then
    select * into ref from race_players where code = p_ref and not disqualified;
  end if;
  loop
    c := substr(md5(random()::text || clock_timestamp()::text), 1, 6);
    exit when not exists (select 1 from race_players where code = c);
    tries := tries + 1;
    if tries > 20 then raise exception 'no code'; end if;
  end loop;
  insert into race_players (ig_id, ig_username, first_name, code, referred_by)
  values (p_ig_id, nullif(p_username, ''), p_name, c, ref.id)
  returning * into me;
  -- The stamp: only while the referrer has fewer than 10; the 10th stamp records the finish time.
  if ref.id is not null and ref.stamps < 10 then
    update race_players
       set stamps = stamps + 1,
           last_stamp_at = now(),
           completed_at = case when stamps + 1 = 10 then now() else completed_at end
     where id = ref.id and stamps < 10;
  end if;
  return json_build_object('ok', true, 'new', true, 'code', me.code, 'name', me.first_name, 'stamps', 0);
end $$;

-- One card, by its public code.
create or replace function public.race_card(p_code text)
returns json language sql security definer set search_path = public stable as $$
  select json_build_object('name', first_name, 'stamps', stamps, 'done', completed_at is not null)
  from race_players where code = p_code and not disqualified;
$$;

-- The public board: top 10 by stamps; on a tie, whoever reached that count first. First names only.
create or replace function public.race_board()
returns json language sql security definer set search_path = public stable as $$
  select json_build_object(
    'top', coalesce((select json_agg(t) from (
      select first_name as name, stamps, completed_at is not null as done
      from race_players where not disqualified and stamps > 0
      order by stamps desc, last_stamp_at
      limit 10) t), '[]'::json),
    'players', (select count(*) from race_players where not disqualified)
  );
$$;

revoke all on function public.race_join(text, text, text, text) from public, anon, authenticated;
revoke all on function public.race_card(text) from public, anon, authenticated;
revoke all on function public.race_board() from public, anon, authenticated;
grant execute on function public.race_join(text, text, text, text) to service_role;
grant execute on function public.race_card(text) to service_role;
grant execute on function public.race_board() to service_role;
