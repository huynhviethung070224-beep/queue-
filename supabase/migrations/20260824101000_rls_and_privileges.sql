begin;

revoke all on schema private from public, anon, authenticated;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.admin_users
      where admin_users.user_id = (select auth.uid())
    );
$$;

create function private.current_player_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select player_identities.player_id
  from public.player_identities
  where player_identities.auth_user_id = (select auth.uid());
$$;

create function private.require_authenticated()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
begin
  caller_id = (select auth.uid());

  if caller_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  return caller_id;
end;
$$;

create function private.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
begin
  caller_id = private.require_authenticated();

  if not private.is_admin() then
    raise exception 'Admin authorization is required.' using errcode = '42501';
  end if;

  return caller_id;
end;
$$;

alter table public.players enable row level security;
alter table public.player_identities enable row level security;
alter table public.admin_users enable row level security;
alter table public.club_sessions enable row level security;
alter table public.session_players enable row level security;
alter table public.courts enable row level security;
alter table public.queue_entries enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;

revoke all on table public.players from anon, authenticated;
revoke all on table public.player_identities from anon, authenticated;
revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.club_sessions from anon, authenticated;
revoke all on table public.session_players from anon, authenticated;
revoke all on table public.courts from anon, authenticated;
revoke all on table public.queue_entries from anon, authenticated;
revoke all on table public.matches from anon, authenticated;
revoke all on table public.match_players from anon, authenticated;

grant select on table public.players to authenticated;
grant select on table public.player_identities to authenticated;
grant select on table public.club_sessions to authenticated;
grant select on table public.session_players to authenticated;
grant select on table public.courts to authenticated;
grant select on table public.queue_entries to authenticated;
grant select on table public.matches to authenticated;
grant select on table public.match_players to authenticated;

create policy players_authenticated_read
on public.players
for select
to authenticated
using (
  players.id = (select private.current_player_id())
  or (select private.is_admin())
  or exists (
    select 1
    from public.session_players
    join public.club_sessions
      on club_sessions.id = session_players.session_id
    where session_players.player_id = players.id
      and club_sessions.status = 'open'
  )
);

create policy player_identities_read_own
on public.player_identities
for select
to authenticated
using ((select auth.uid()) = auth_user_id);

create policy club_sessions_authenticated_read
on public.club_sessions
for select
to authenticated
using (
  club_sessions.status = 'open'
  or (select private.is_admin())
);

create policy session_players_authenticated_read
on public.session_players
for select
to authenticated
using (
  session_players.player_id = (select private.current_player_id())
  or (select private.is_admin())
  or exists (
    select 1
    from public.club_sessions
    where club_sessions.id = session_players.session_id
      and club_sessions.status = 'open'
  )
);

create policy courts_authenticated_read
on public.courts
for select
to authenticated
using (true);

create policy queue_entries_authenticated_read
on public.queue_entries
for select
to authenticated
using (
  queue_entries.player_id = (select private.current_player_id())
  or (select private.is_admin())
  or exists (
    select 1
    from public.club_sessions
    where club_sessions.id = queue_entries.session_id
      and club_sessions.status = 'open'
  )
);

create policy matches_authenticated_read
on public.matches
for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1
    from public.club_sessions
    where club_sessions.id = matches.session_id
      and club_sessions.status = 'open'
  )
);

create policy match_players_authenticated_read
on public.match_players
for select
to authenticated
using (
  match_players.player_id = (select private.current_player_id())
  or (select private.is_admin())
  or exists (
    select 1
    from public.club_sessions
    where club_sessions.id = match_players.session_id
      and club_sessions.status = 'open'
  )
);

revoke execute on all functions in schema private from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from public;

commit;
