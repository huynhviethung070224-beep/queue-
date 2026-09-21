alter table public.players
  add column is_archived boolean not null default false;

create function private.reject_archived_member_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.players where id = new.player_id and is_archived) then
    raise exception 'This member is archived and cannot join a club session.' using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger session_players_reject_archived_member
before insert or update on public.session_players
for each row execute function private.reject_archived_member_session();

create or replace function public.search_member_profiles(p_query text)
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
declare normalized_query text;
begin
  perform private.require_authenticated();
  normalized_query = btrim(p_query);
  if normalized_query is null or char_length(normalized_query) not between 2 and 40 then
    raise exception 'Search text must contain between 2 and 40 characters.' using errcode = '22023';
  end if;
  return query
  select players.id, players.display_name, players.skill_level, max(session_players.joined_at)
  from public.players
  left join public.session_players on session_players.player_id = players.id
  where not players.is_archived
    and pg_catalog.strpos(pg_catalog.lower(players.display_name), pg_catalog.lower(normalized_query)) > 0
  group by players.id, players.display_name, players.skill_level, players.created_at
  order by players.display_name, players.created_at, players.id
  limit 10;
end;
$$;

drop function if exists public.list_members_for_admin(text);

create function public.list_members_for_admin(p_search text default null)
returns table (
  player_id uuid,
  display_name text,
  skill_level public.skill_level,
  is_paid boolean,
  is_archived boolean,
  created_at timestamptz,
  last_joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare normalized_search text;
begin
  perform private.require_admin();
  normalized_search = nullif(btrim(p_search), '');
  if normalized_search is not null and char_length(normalized_search) > 40 then
    raise exception 'Search text must contain at most 40 characters.' using errcode = '22023';
  end if;
  return query
  select players.id, players.display_name, players.skill_level,
    coalesce(member_payment_statuses.is_paid, false), players.is_archived,
    players.created_at, max(session_players.joined_at)
  from public.players
  left join public.member_payment_statuses on member_payment_statuses.player_id = players.id
  left join public.session_players on session_players.player_id = players.id
  where normalized_search is null
    or pg_catalog.strpos(pg_catalog.lower(players.display_name), pg_catalog.lower(normalized_search)) > 0
  group by players.id, players.display_name, players.skill_level,
    member_payment_statuses.is_paid, players.is_archived, players.created_at
  order by players.is_archived, players.display_name, players.created_at, players.id;
end;
$$;

create function public.admin_set_member_archived(p_player_id uuid, p_archived boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  if not exists (select 1 from public.players where id = p_player_id for update) then
    raise exception 'Member was not found.' using errcode = 'P0001';
  end if;
  if p_archived and exists (
    select 1 from public.queue_entries
    where player_id = p_player_id and status in ('waiting', 'called', 'playing')
  ) then
    raise exception 'Resolve the active queue or match before archiving this member.' using errcode = '55000';
  end if;
  update public.players set is_archived = p_archived where id = p_player_id;
end;
$$;

revoke execute on function public.admin_set_member_archived(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_member_archived(uuid, boolean) to authenticated;
revoke execute on function private.reject_archived_member_session() from public, anon, authenticated;
