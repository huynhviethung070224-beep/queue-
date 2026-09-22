create or replace function public.get_my_member_request()
returns table (id uuid, request_type public.member_request_type, status public.member_request_status, drexel_user_id text, display_name text, requested_skill_level public.skill_level, rejection_reason text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select requests.id, requests.request_type, requests.status, requests.drexel_user_id,
    requests.display_name, requests.requested_skill_level, requests.rejection_reason, requests.created_at
  from public.member_requests as requests
  where requests.auth_user_id = (select private.require_authenticated())
  order by requests.created_at desc, requests.id desc limit 1;
$$;

create or replace function public.join_current_queue(p_display_name text, p_skill_level public.skill_level)
returns table (queue_entry_id uuid, player_id uuid, session_id uuid, status public.queue_status)
language plpgsql security definer set search_path = '' as $$
declare caller_id uuid; active_session_id uuid; current_player_id uuid; current_queue_entry_id uuid; current_queue_status public.queue_status;
begin
  caller_id = private.require_authenticated();
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller_id::text, 0));
  select club_sessions.id into active_session_id from public.club_sessions where club_sessions.status = 'open' for update;
  if active_session_id is null then raise exception 'There is no open club session.' using errcode = 'P0001'; end if;
  select player_identities.player_id into current_player_id from public.player_identities where player_identities.auth_user_id = caller_id for update;
  if current_player_id is null then raise exception 'Your profile must be approved before joining the queue.' using errcode = '42501'; end if;
  if exists (select 1 from public.players where players.id = current_player_id and players.is_archived) then raise exception 'This member is archived and cannot join.' using errcode = '55000'; end if;
  insert into public.session_players (session_id, player_id, is_active) values (active_session_id, current_player_id, true)
    on conflict on constraint session_players_pkey do update set is_active = true;
  select queue_entries.id, queue_entries.status into current_queue_entry_id, current_queue_status from public.queue_entries
    where queue_entries.session_id = active_session_id and queue_entries.player_id = current_player_id and queue_entries.status in ('waiting','called','playing') for update;
  if current_queue_entry_id is null then insert into public.queue_entries (session_id, player_id, status, queued_at)
    values (active_session_id, current_player_id, 'waiting', statement_timestamp()) returning id, status into current_queue_entry_id, current_queue_status; end if;
  return query select current_queue_entry_id, current_player_id, active_session_id, current_queue_status;
end; $$;

revoke execute on function public.get_my_member_request() from public, anon, authenticated;
revoke execute on function public.join_current_queue(text, public.skill_level) from public, anon, authenticated;
grant execute on function public.get_my_member_request() to authenticated;
grant execute on function public.join_current_queue(text, public.skill_level) to authenticated;
