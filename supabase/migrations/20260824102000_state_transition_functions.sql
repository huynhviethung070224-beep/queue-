begin;

create function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin();
$$;

create function public.join_current_queue(
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
  on conflict (session_id, player_id)
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

create function public.leave_current_queue()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  current_player_id uuid;
  active_session_id uuid;
  current_queue_entry_id uuid;
  current_queue_status public.queue_status;
begin
  caller_id = private.require_authenticated();

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text, 0)
  );

  current_player_id = private.current_player_id();

  if current_player_id is null then
    raise exception 'No member identity exists for the current user.'
      using errcode = 'P0001';
  end if;

  select club_sessions.id
  into active_session_id
  from public.club_sessions
  where club_sessions.status = 'open'
  for update;

  if active_session_id is null then
    raise exception 'There is no open club session.' using errcode = 'P0001';
  end if;

  select queue_entries.id, queue_entries.status
  into current_queue_entry_id, current_queue_status
  from public.queue_entries
  where queue_entries.session_id = active_session_id
    and queue_entries.player_id = current_player_id
    and queue_entries.status in ('waiting', 'called', 'playing')
  for update;

  if current_queue_entry_id is null then
    raise exception 'The current user does not have an active queue entry.'
      using errcode = 'P0001';
  end if;

  if current_queue_status <> 'waiting' then
    raise exception 'Only a waiting player may leave the queue.'
      using errcode = 'P0001';
  end if;

  update public.queue_entries
  set status = 'left',
      ended_at = statement_timestamp()
  where queue_entries.id = current_queue_entry_id;

  update public.session_players
  set is_active = false
  where session_players.session_id = active_session_id
    and session_players.player_id = current_player_id;

  return current_queue_entry_id;
end;
$$;

create function public.create_club_session(
  p_name text,
  p_auto_requeue boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text;
  new_session_id uuid;
begin
  perform private.require_admin();
  normalized_name = btrim(p_name);

  if p_auto_requeue is null then
    raise exception 'Auto-requeue setting is required.' using errcode = '22023';
  end if;

  if normalized_name is null or char_length(normalized_name) not between 2 and 80 then
    raise exception 'Session name must contain between 2 and 80 characters.'
      using errcode = '22023';
  end if;

  if p_name <> normalized_name then
    raise exception 'Session name must not contain leading or trailing whitespace.'
      using errcode = '22023';
  end if;

  insert into public.club_sessions (
    name,
    auto_requeue
  )
  values (
    normalized_name,
    p_auto_requeue
  )
  returning club_sessions.id into new_session_id;

  return new_session_id;
end;
$$;

create function public.open_club_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status public.club_session_status;
  existing_open_session_id uuid;
begin
  perform private.require_admin();
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('badminton-fairplay-open-session', 0)
  );

  select club_sessions.status
  into target_status
  from public.club_sessions
  where club_sessions.id = p_session_id
  for update;

  if target_status is null then
    raise exception 'Club session not found.' using errcode = 'P0001';
  end if;

  if target_status <> 'draft' then
    raise exception 'Only a draft club session may be opened.'
      using errcode = 'P0001';
  end if;

  select club_sessions.id
  into existing_open_session_id
  from public.club_sessions
  where club_sessions.status = 'open'
    and club_sessions.id <> p_session_id
  for update;

  if existing_open_session_id is not null then
    raise exception 'Another club session is already open.'
      using errcode = '23505';
  end if;

  update public.club_sessions
  set status = 'open',
      opened_at = statement_timestamp()
  where club_sessions.id = p_session_id;
end;
$$;

create function public.close_club_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status public.club_session_status;
  closed_time timestamptz;
begin
  perform private.require_admin();
  closed_time = statement_timestamp();

  select club_sessions.status
  into target_status
  from public.club_sessions
  where club_sessions.id = p_session_id
  for update;

  if target_status is null then
    raise exception 'Club session not found.' using errcode = 'P0001';
  end if;

  if target_status <> 'open' then
    raise exception 'Only an open club session may be closed.'
      using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.matches
    where matches.session_id = p_session_id
      and matches.status in ('called', 'playing')
  ) then
    raise exception 'Complete or cancel active matches before closing the session.'
      using errcode = 'P0001';
  end if;

  update public.queue_entries
  set status = 'removed',
      ended_at = closed_time
  where queue_entries.session_id = p_session_id
    and queue_entries.status = 'waiting';

  update public.session_players
  set is_active = false
  where session_players.session_id = p_session_id;

  update public.club_sessions
  set status = 'closed',
      closed_at = closed_time
  where club_sessions.id = p_session_id;
end;
$$;

create function public.assign_players_to_court(
  p_court_number smallint,
  p_player_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_session_id uuid;
  current_court_status public.court_status;
  selected_count integer;
  affected_count integer;
  new_match_id uuid;
  call_time timestamptz;
begin
  perform private.require_admin();

  if cardinality(p_player_ids) <> 4 then
    raise exception 'Exactly four player IDs are required.' using errcode = '22023';
  end if;

  select count(distinct selected_player_id)
  into selected_count
  from unnest(p_player_ids) as selected_player_id;

  if selected_count <> 4 then
    raise exception 'The four player IDs must be distinct and non-null.'
      using errcode = '22023';
  end if;

  select club_sessions.id
  into active_session_id
  from public.club_sessions
  where club_sessions.status = 'open'
  for update;

  if active_session_id is null then
    raise exception 'There is no open club session.' using errcode = 'P0001';
  end if;

  select courts.status
  into current_court_status
  from public.courts
  where courts.number = p_court_number
  for update;

  if current_court_status is null then
    raise exception 'Court not found.' using errcode = 'P0001';
  end if;

  if current_court_status <> 'available' then
    raise exception 'The selected court is not available.' using errcode = 'P0001';
  end if;

  perform 1
  from public.queue_entries
  where queue_entries.session_id = active_session_id
    and queue_entries.player_id = any(p_player_ids)
    and queue_entries.status = 'waiting'
  order by queue_entries.id
  for update;

  select count(*)
  into selected_count
  from public.queue_entries
  where queue_entries.session_id = active_session_id
    and queue_entries.player_id = any(p_player_ids)
    and queue_entries.status = 'waiting';

  if selected_count <> 4 then
    raise exception 'Every selected player must still be waiting in the open session.'
      using errcode = 'P0001';
  end if;

  call_time = statement_timestamp();

  insert into public.matches (
    session_id,
    court_number,
    status,
    called_at
  )
  values (
    active_session_id,
    p_court_number,
    'called',
    call_time
  )
  returning matches.id into new_match_id;

  update public.queue_entries
  set status = 'called',
      called_at = call_time
  where queue_entries.session_id = active_session_id
    and queue_entries.player_id = any(p_player_ids)
    and queue_entries.status = 'waiting';

  get diagnostics affected_count = row_count;

  if affected_count <> 4 then
    raise exception 'Exactly four waiting queue entries must be called.'
      using errcode = '23514';
  end if;

  insert into public.match_players (
    match_id,
    session_id,
    player_id,
    queue_entry_id
  )
  select
    new_match_id,
    active_session_id,
    queue_entries.player_id,
    queue_entries.id
  from public.queue_entries
  where queue_entries.session_id = active_session_id
    and queue_entries.player_id = any(p_player_ids)
    and queue_entries.status = 'called';

  get diagnostics affected_count = row_count;

  if affected_count <> 4 then
    raise exception 'Exactly four match-player records must be created.'
      using errcode = '23514';
  end if;

  update public.courts
  set status = 'called'
  where courts.number = p_court_number;

  return new_match_id;
end;
$$;

create function public.start_called_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status public.match_status;
  target_court_number smallint;
  player_count integer;
  affected_count integer;
  start_time timestamptz;
begin
  perform private.require_admin();

  select matches.status, matches.court_number
  into target_status, target_court_number
  from public.matches
  where matches.id = p_match_id
  for update;

  if target_status is null then
    raise exception 'Match not found.' using errcode = 'P0001';
  end if;

  if target_status <> 'called' then
    raise exception 'Only a called match may be started.' using errcode = 'P0001';
  end if;

  perform 1
  from public.courts
  where courts.number = target_court_number
  for update;

  perform 1
  from public.match_players
  where match_players.match_id = p_match_id
  order by match_players.player_id
  for update;

  select count(*)
  into player_count
  from public.match_players
  where match_players.match_id = p_match_id
    and match_players.released_at is null;

  if player_count <> 4 then
    raise exception 'A match must contain exactly four active players before it starts.'
      using errcode = '23514';
  end if;

  start_time = statement_timestamp();

  update public.matches
  set status = 'playing',
      started_at = start_time
  where matches.id = p_match_id;

  update public.queue_entries
  set status = 'playing',
      started_at = start_time
  where queue_entries.id in (
    select match_players.queue_entry_id
    from public.match_players
    where match_players.match_id = p_match_id
  )
    and queue_entries.status = 'called';

  get diagnostics affected_count = row_count;

  if affected_count <> 4 then
    raise exception 'All four called queue entries must be valid before starting.'
      using errcode = '23514';
  end if;

  update public.courts
  set status = 'playing'
  where courts.number = target_court_number
    and courts.status = 'called';

  get diagnostics affected_count = row_count;

  if affected_count <> 1 then
    raise exception 'The court is no longer in called state.'
      using errcode = 'P0001';
  end if;
end;
$$;

create function public.cancel_called_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status public.match_status;
  target_court_number smallint;
  cancel_time timestamptz;
  affected_count integer;
begin
  perform private.require_admin();

  select matches.status, matches.court_number
  into target_status, target_court_number
  from public.matches
  where matches.id = p_match_id
  for update;

  if target_status is null then
    raise exception 'Match not found.' using errcode = 'P0001';
  end if;

  if target_status <> 'called' then
    raise exception 'Only a called match may be cancelled.' using errcode = 'P0001';
  end if;

  perform 1
  from public.courts
  where courts.number = target_court_number
  for update;

  perform 1
  from public.match_players
  where match_players.match_id = p_match_id
  order by match_players.player_id
  for update;

  cancel_time = statement_timestamp();

  update public.queue_entries
  set status = 'waiting',
      called_at = null
  where queue_entries.id in (
    select match_players.queue_entry_id
    from public.match_players
    where match_players.match_id = p_match_id
  )
    and queue_entries.status = 'called';

  get diagnostics affected_count = row_count;

  if affected_count <> 4 then
    raise exception 'All four called queue entries must be valid before cancellation.'
      using errcode = '23514';
  end if;

  update public.match_players
  set released_at = cancel_time
  where match_players.match_id = p_match_id
    and match_players.released_at is null;

  get diagnostics affected_count = row_count;

  if affected_count <> 4 then
    raise exception 'Exactly four active match players must be released.'
      using errcode = '23514';
  end if;

  update public.matches
  set status = 'cancelled',
      ended_at = cancel_time
  where matches.id = p_match_id;

  update public.courts
  set status = 'available'
  where courts.number = target_court_number
    and courts.status = 'called';

  get diagnostics affected_count = row_count;

  if affected_count <> 1 then
    raise exception 'The court is no longer in called state.'
      using errcode = 'P0001';
  end if;
end;
$$;

create function public.end_playing_match(
  p_match_id uuid,
  p_requeue_players boolean default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status public.match_status;
  target_session_id uuid;
  target_court_number smallint;
  should_requeue boolean;
  player_count integer;
  affected_count integer;
  end_time timestamptz;
begin
  perform private.require_admin();

  select
    matches.status,
    matches.session_id,
    matches.court_number
  into
    target_status,
    target_session_id,
    target_court_number
  from public.matches
  where matches.id = p_match_id
  for update;

  if target_status is null then
    raise exception 'Match not found.' using errcode = 'P0001';
  end if;

  if target_status <> 'playing' then
    raise exception 'Only a playing match may be ended.' using errcode = 'P0001';
  end if;

  select coalesce(p_requeue_players, club_sessions.auto_requeue)
  into should_requeue
  from public.club_sessions
  where club_sessions.id = target_session_id
  for update;

  perform 1
  from public.courts
  where courts.number = target_court_number
  for update;

  perform 1
  from public.match_players
  where match_players.match_id = p_match_id
  order by match_players.player_id
  for update;

  select count(*)
  into player_count
  from public.match_players
  where match_players.match_id = p_match_id
    and match_players.released_at is null;

  if player_count <> 4 then
    raise exception 'A playing match must contain exactly four active players.'
      using errcode = '23514';
  end if;

  end_time = statement_timestamp();

  update public.queue_entries
  set status = 'completed',
      ended_at = end_time
  where queue_entries.id in (
    select match_players.queue_entry_id
    from public.match_players
    where match_players.match_id = p_match_id
  )
    and queue_entries.status = 'playing';

  get diagnostics affected_count = row_count;

  if affected_count <> 4 then
    raise exception 'All four playing queue entries must be completed together.'
      using errcode = '23514';
  end if;

  update public.session_players
  set games_played = session_players.games_played + 1,
      last_match_ended_at = end_time,
      is_active = should_requeue
  where session_players.session_id = target_session_id
    and session_players.player_id in (
      select match_players.player_id
      from public.match_players
      where match_players.match_id = p_match_id
    );

  get diagnostics affected_count = row_count;

  if affected_count <> 4 then
    raise exception 'All four session-player records must be updated together.'
      using errcode = '23514';
  end if;

  update public.match_players
  set released_at = end_time
  where match_players.match_id = p_match_id
    and match_players.released_at is null;

  get diagnostics affected_count = row_count;

  if affected_count <> 4 then
    raise exception 'Exactly four active match players must be released.'
      using errcode = '23514';
  end if;

  update public.matches
  set status = 'completed',
      ended_at = end_time,
      requeued_on_completion = should_requeue
  where matches.id = p_match_id;

  update public.courts
  set status = 'available'
  where courts.number = target_court_number
    and courts.status = 'playing';

  get diagnostics affected_count = row_count;

  if affected_count <> 1 then
    raise exception 'The court is no longer in playing state.'
      using errcode = 'P0001';
  end if;

  if should_requeue then
    insert into public.queue_entries (
      session_id,
      player_id,
      status,
      queued_at
    )
    select
      target_session_id,
      match_players.player_id,
      'waiting',
      end_time
    from public.match_players
    where match_players.match_id = p_match_id;
  end if;
end;
$$;

create function public.admin_remove_player(
  p_session_id uuid,
  p_player_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_queue_entry_id uuid;
  active_queue_status public.queue_status;
begin
  perform private.require_admin();

  select queue_entries.id, queue_entries.status
  into active_queue_entry_id, active_queue_status
  from public.queue_entries
  where queue_entries.session_id = p_session_id
    and queue_entries.player_id = p_player_id
    and queue_entries.status in ('waiting', 'called', 'playing')
  for update;

  if active_queue_entry_id is null then
    raise exception 'The player has no active queue entry in this session.'
      using errcode = 'P0001';
  end if;

  if active_queue_status <> 'waiting' then
    raise exception 'Cancel the called match or end the playing match before removing this player.'
      using errcode = 'P0001';
  end if;

  update public.queue_entries
  set status = 'removed',
      ended_at = statement_timestamp()
  where queue_entries.id = active_queue_entry_id;

  update public.session_players
  set is_active = false
  where session_players.session_id = p_session_id
    and session_players.player_id = p_player_id;

  return active_queue_entry_id;
end;
$$;

create function public.admin_update_player(
  p_player_id uuid,
  p_display_name text,
  p_skill_level public.skill_level
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text;
begin
  perform private.require_admin();
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

  update public.players
  set display_name = normalized_name,
      skill_level = p_skill_level
  where players.id = p_player_id;

  if not found then
    raise exception 'Player not found.' using errcode = 'P0001';
  end if;
end;
$$;

create function public.set_court_enabled(
  p_court_number smallint,
  p_enabled boolean
)
returns public.court_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status public.court_status;
  next_status public.court_status;
begin
  perform private.require_admin();

  if p_enabled is null then
    raise exception 'Enabled setting is required.' using errcode = '22023';
  end if;

  select courts.status
  into current_status
  from public.courts
  where courts.number = p_court_number
  for update;

  if current_status is null then
    raise exception 'Court not found.' using errcode = 'P0001';
  end if;

  if current_status in ('called', 'playing') then
    raise exception 'A court with an active match cannot be enabled or disabled.'
      using errcode = 'P0001';
  end if;

  next_status = case when p_enabled then 'available' else 'disabled' end;

  update public.courts
  set status = next_status
  where courts.number = p_court_number;

  return next_status;
end;
$$;

revoke execute on function public.is_current_user_admin() from public, anon, authenticated;
revoke execute on function public.join_current_queue(text, public.skill_level) from public, anon, authenticated;
revoke execute on function public.leave_current_queue() from public, anon, authenticated;
revoke execute on function public.create_club_session(text, boolean) from public, anon, authenticated;
revoke execute on function public.open_club_session(uuid) from public, anon, authenticated;
revoke execute on function public.close_club_session(uuid) from public, anon, authenticated;
revoke execute on function public.assign_players_to_court(smallint, uuid[]) from public, anon, authenticated;
revoke execute on function public.start_called_match(uuid) from public, anon, authenticated;
revoke execute on function public.cancel_called_match(uuid) from public, anon, authenticated;
revoke execute on function public.end_playing_match(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.admin_remove_player(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.admin_update_player(uuid, text, public.skill_level) from public, anon, authenticated;
revoke execute on function public.set_court_enabled(smallint, boolean) from public, anon, authenticated;

grant execute on function public.is_current_user_admin() to authenticated;
grant execute on function public.join_current_queue(text, public.skill_level) to authenticated;
grant execute on function public.leave_current_queue() to authenticated;
grant execute on function public.create_club_session(text, boolean) to authenticated;
grant execute on function public.open_club_session(uuid) to authenticated;
grant execute on function public.close_club_session(uuid) to authenticated;
grant execute on function public.assign_players_to_court(smallint, uuid[]) to authenticated;
grant execute on function public.start_called_match(uuid) to authenticated;
grant execute on function public.cancel_called_match(uuid) to authenticated;
grant execute on function public.end_playing_match(uuid, boolean) to authenticated;
grant execute on function public.admin_remove_player(uuid, uuid) to authenticated;
grant execute on function public.admin_update_player(uuid, text, public.skill_level) to authenticated;
grant execute on function public.set_court_enabled(smallint, boolean) to authenticated;

commit;
