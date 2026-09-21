begin;

alter table public.club_sessions
  add column default_match_duration_seconds integer not null default 420,
  add constraint club_sessions_match_duration_check
    check (default_match_duration_seconds between 60 and 3600);

alter table public.matches
  add column duration_seconds integer not null default 420,
  add constraint matches_duration_check
    check (duration_seconds between 60 and 3600);

create table public.member_payment_statuses (
  player_id uuid primary key references public.players (id) on delete cascade,
  is_paid boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.member_payment_statuses (player_id, is_paid)
select players.id, false
from public.players;

create function private.create_default_member_payment_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.member_payment_statuses (player_id, is_paid)
  values (new.id, false)
  on conflict (player_id) do nothing;
  return new;
end;
$$;

create trigger players_create_default_payment_status
after insert on public.players
for each row execute function private.create_default_member_payment_status();

create function private.copy_session_match_duration()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select club_sessions.default_match_duration_seconds
  into new.duration_seconds
  from public.club_sessions
  where club_sessions.id = new.session_id;

  if new.duration_seconds is null then
    raise exception 'Club session not found.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger matches_copy_session_duration
before insert on public.matches
for each row execute function private.copy_session_match_duration();

alter table public.member_payment_statuses enable row level security;
revoke all on table public.member_payment_statuses from anon, authenticated;

create policy member_payment_statuses_admin_read
on public.member_payment_statuses
for select
to authenticated
using ((select private.is_admin()));

grant select on table public.member_payment_statuses to authenticated;

create function public.search_member_profiles(p_query text)
returns table (
  player_id uuid,
  display_name text,
  skill_level public.skill_level,
  last_joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text;
begin
  perform private.require_authenticated();
  normalized_query = btrim(p_query);

  if normalized_query is null or char_length(normalized_query) not between 2 and 40 then
    raise exception 'Search text must contain between 2 and 40 characters.'
      using errcode = '22023';
  end if;

  return query
  select
    players.id,
    players.display_name,
    players.skill_level,
    max(session_players.joined_at) as last_joined_at
  from public.players
  left join public.session_players
    on session_players.player_id = players.id
  where pg_catalog.strpos(
    pg_catalog.lower(players.display_name),
    pg_catalog.lower(normalized_query)
  ) > 0
  group by players.id, players.display_name, players.skill_level, players.created_at
  order by players.display_name, players.created_at, players.id
  limit 10;
end;
$$;

create function public.list_members_for_admin(p_search text default null)
returns table (
  player_id uuid,
  display_name text,
  skill_level public.skill_level,
  is_paid boolean,
  created_at timestamptz,
  last_joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_search text;
begin
  perform private.require_admin();
  normalized_search = nullif(btrim(p_search), '');

  if normalized_search is not null and char_length(normalized_search) > 40 then
    raise exception 'Search text must contain at most 40 characters.'
      using errcode = '22023';
  end if;

  return query
  select
    players.id,
    players.display_name,
    players.skill_level,
    coalesce(member_payment_statuses.is_paid, false),
    players.created_at,
    max(session_players.joined_at) as last_joined_at
  from public.players
  left join public.member_payment_statuses
    on member_payment_statuses.player_id = players.id
  left join public.session_players
    on session_players.player_id = players.id
  where normalized_search is null
    or pg_catalog.strpos(
      pg_catalog.lower(players.display_name),
      pg_catalog.lower(normalized_search)
    ) > 0
  group by
    players.id,
    players.display_name,
    players.skill_level,
    member_payment_statuses.is_paid,
    players.created_at
  order by players.display_name, players.created_at, players.id;
end;
$$;

create function public.set_member_payment_status(
  p_player_id uuid,
  p_is_paid boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();

  if p_is_paid is null then
    raise exception 'Payment status is required.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.players where players.id = p_player_id
  ) then
    raise exception 'Player not found.' using errcode = 'P0001';
  end if;

  insert into public.member_payment_statuses (
    player_id,
    is_paid,
    updated_at,
    updated_by
  )
  values (
    p_player_id,
    p_is_paid,
    statement_timestamp(),
    (select auth.uid())
  )
  on conflict (player_id)
  do update set
    is_paid = excluded.is_paid,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;
end;
$$;

create function public.set_session_match_duration(
  p_session_id uuid,
  p_duration_seconds integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status public.club_session_status;
begin
  perform private.require_admin();

  if p_duration_seconds is null or p_duration_seconds not between 60 and 3600 then
    raise exception 'Match duration must be between 1 and 60 minutes.'
      using errcode = '22023';
  end if;

  select club_sessions.status
  into target_status
  from public.club_sessions
  where club_sessions.id = p_session_id
  for update;

  if target_status is null then
    raise exception 'Club session not found.' using errcode = 'P0001';
  end if;

  if target_status = 'closed' then
    raise exception 'A closed session cannot be changed.' using errcode = 'P0001';
  end if;

  update public.club_sessions
  set default_match_duration_seconds = p_duration_seconds
  where club_sessions.id = p_session_id;
end;
$$;

revoke execute on function public.search_member_profiles(text) from public, anon, authenticated;
revoke execute on function public.list_members_for_admin(text) from public, anon, authenticated;
revoke execute on function public.set_member_payment_status(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.set_session_match_duration(uuid, integer) from public, anon, authenticated;

grant execute on function public.search_member_profiles(text) to authenticated;
grant execute on function public.list_members_for_admin(text) to authenticated;
grant execute on function public.set_member_payment_status(uuid, boolean) to authenticated;
grant execute on function public.set_session_match_duration(uuid, integer) to authenticated;

revoke execute on function private.create_default_member_payment_status() from public, anon, authenticated;
revoke execute on function private.copy_session_match_duration() from public, anon, authenticated;

commit;
