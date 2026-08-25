begin;

create or replace function public.join_current_queue(
  p_display_name text,
  p_skill_level public.skill_level
)
returns table (
  queue_entry_id uuid,
  player_id uuid,
  session_id uuid,
  status public.queue_status
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  normalized_name text;
  active_session_id uuid;
  current_player_id uuid;
  current_queue_entry_id uuid;
  current_queue_status public.queue_status;
begin
  caller_id = private.require_authenticated();
  normalized_name = btrim(p_display_name);

  if p_skill_level is null then
    raise exception 'Skill level is required.' using errcode = '22023';
  end if;

  if normalized_name is null or char_length(normalized_name) not between 2 and 40 then
    raise exception 'Display name must contain between 2 and 40 characters.'
      using errcode = '22023';
  end if;

  if p_display_name <> normalized_name then
    raise exception 'Display name must not contain leading or trailing whitespace.'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text, 0)
  );

  select club_sessions.id
  into active_session_id
  from public.club_sessions
  where club_sessions.status = 'open'
  for update;

  if active_session_id is null then
    raise exception 'There is no open club session.' using errcode = 'P0001';
  end if;

  select player_identities.player_id
  into current_player_id
  from public.player_identities
  where player_identities.auth_user_id = caller_id
  for update;

  if current_player_id is null then
    insert into public.players (display_name, skill_level)
    values (normalized_name, p_skill_level)
    returning players.id into current_player_id;

    insert into public.player_identities (auth_user_id, player_id)
    values (caller_id, current_player_id);
  else
    update public.players
    set display_name = normalized_name,
        skill_level = p_skill_level
    where players.id = current_player_id;
  end if;

  insert into public.session_players (
    session_id,
    player_id,
    is_active
  )
  values (
    active_session_id,
    current_player_id,
    true
  )
  on conflict on constraint session_players_pkey
  do update set is_active = true;

  select queue_entries.id, queue_entries.status
  into current_queue_entry_id, current_queue_status
  from public.queue_entries
  where queue_entries.session_id = active_session_id
    and queue_entries.player_id = current_player_id
    and queue_entries.status in ('waiting', 'called', 'playing')
  for update;

  if current_queue_entry_id is null then
    insert into public.queue_entries (
      session_id,
      player_id,
      status,
      queued_at
    )
    values (
      active_session_id,
      current_player_id,
      'waiting',
      statement_timestamp()
    )
    returning queue_entries.id, queue_entries.status
    into current_queue_entry_id, current_queue_status;
  end if;

  return query
  select
    current_queue_entry_id,
    current_player_id,
    active_session_id,
    current_queue_status;
end;
$$;

commit;
