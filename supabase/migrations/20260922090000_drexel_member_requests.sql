-- Long-lived member identity is a normalized Drexel User ID. Anonymous Auth only
-- remembers an approved device and never creates a player by itself.
alter table public.players add column drexel_user_id text;

alter table public.players add constraint players_drexel_user_id_normalized_check
  check (drexel_user_id is null or drexel_user_id = pg_catalog.lower(btrim(drexel_user_id)));

create unique index players_drexel_user_id_unique_idx
  on public.players (drexel_user_id)
  where drexel_user_id is not null;

-- A player can have several approved devices. Each device remains linked to only one player.
alter table public.player_identities drop constraint player_identities_player_id_key;
create index player_identities_player_id_idx on public.player_identities (player_id);

create type public.member_request_type as enum (
  'create_profile', 'link_new_device', 'change_skill_level'
);
create type public.member_request_status as enum ('pending', 'approved', 'rejected');

create table public.member_requests (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  player_id uuid references public.players (id) on delete cascade,
  drexel_user_id text not null,
  display_name text,
  requested_skill_level public.skill_level,
  request_type public.member_request_type not null,
  status public.member_request_status not null default 'pending',
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default statement_timestamp(),
  constraint member_requests_drexel_user_id_normalized_check
    check (drexel_user_id = pg_catalog.lower(btrim(drexel_user_id))),
  constraint member_requests_drexel_user_id_format_check
    check (drexel_user_id ~ '^[a-z][a-z0-9._-]{1,31}$'),
  constraint member_requests_create_fields_check check (
    (request_type = 'create_profile' and player_id is null and display_name = btrim(display_name)
      and char_length(display_name) between 2 and 40 and requested_skill_level is not null)
    or (request_type = 'link_new_device' and player_id is not null and display_name is null and requested_skill_level is null)
    or (request_type = 'change_skill_level' and player_id is not null and display_name is null and requested_skill_level is not null)
  ),
  constraint member_requests_review_check check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null and rejection_reason is null)
    or (status = 'approved' and reviewed_by is not null and reviewed_at is not null and rejection_reason is null)
    or (status = 'rejected' and reviewed_by is not null and reviewed_at is not null)
  )
);

create unique index member_requests_one_pending_per_device_idx
  on public.member_requests (auth_user_id) where status = 'pending';
create index member_requests_pending_created_idx
  on public.member_requests (created_at, id) where status = 'pending';

alter table public.member_requests enable row level security;
revoke all on table public.member_requests from anon, authenticated;
grant select on table public.member_requests to authenticated;
create policy member_requests_owner_read on public.member_requests for select to authenticated
  using (auth_user_id = (select auth.uid()));
create policy member_requests_admin_read on public.member_requests for select to authenticated
  using ((select private.is_admin()));

create function private.normalize_drexel_user_id(p_drexel_user_id text)
returns text language plpgsql immutable set search_path = '' as $$
declare normalized text;
begin
  normalized = pg_catalog.lower(btrim(p_drexel_user_id));
  if normalized is null or normalized !~ '^[a-z][a-z0-9._-]{1,31}$' then
    raise exception 'Enter a valid Drexel User ID.' using errcode = '22023';
  end if;
  return normalized;
end; $$;

create function public.submit_create_profile_request(p_drexel_user_id text, p_display_name text, p_skill_level public.skill_level)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid; normalized_id text; request_id uuid;
begin
  caller = private.require_authenticated();
  normalized_id = private.normalize_drexel_user_id(p_drexel_user_id);
  if p_display_name is null or p_display_name <> btrim(p_display_name) or char_length(p_display_name) not between 2 and 40 or p_skill_level is null then
    raise exception 'Provide a display name and skill level.' using errcode = '22023';
  end if;
  if exists (select 1 from public.player_identities where auth_user_id = caller) then raise exception 'This device already has an approved profile.' using errcode = '23514'; end if;
  if exists (select 1 from public.players where drexel_user_id = normalized_id) then raise exception 'A profile already exists for this Drexel User ID. Find your profile instead.' using errcode = '23505'; end if;
  insert into public.member_requests (auth_user_id, drexel_user_id, display_name, requested_skill_level, request_type)
  values (caller, normalized_id, p_display_name, p_skill_level, 'create_profile')
  on conflict (auth_user_id) where status = 'pending' do update
    set drexel_user_id = excluded.drexel_user_id, display_name = excluded.display_name,
        requested_skill_level = excluded.requested_skill_level, request_type = excluded.request_type,
        player_id = null, created_at = statement_timestamp()
  returning id into request_id;
  return request_id;
end; $$;

create function public.find_member_by_drexel_user_id(p_drexel_user_id text)
returns table (player_id uuid, display_name text, skill_level public.skill_level)
language plpgsql stable security definer set search_path = '' as $$
declare normalized_id text;
begin
  perform private.require_authenticated(); normalized_id = private.normalize_drexel_user_id(p_drexel_user_id);
  return query select id, players.display_name, players.skill_level from public.players
    where drexel_user_id = normalized_id and not is_archived;
end; $$;

create function public.submit_device_link_request(p_drexel_user_id text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid; normalized_id text; target_id uuid; request_id uuid;
begin
  caller = private.require_authenticated(); normalized_id = private.normalize_drexel_user_id(p_drexel_user_id);
  if exists (select 1 from public.player_identities where auth_user_id = caller) then raise exception 'This device already has an approved profile.' using errcode = '23514'; end if;
  select id into target_id from public.players where drexel_user_id = normalized_id and not is_archived for share;
  if target_id is null then raise exception 'No active profile was found for that Drexel User ID.' using errcode = 'P0001'; end if;
  insert into public.member_requests (auth_user_id, player_id, drexel_user_id, request_type)
  values (caller, target_id, normalized_id, 'link_new_device')
  on conflict (auth_user_id) where status = 'pending' do update
    set player_id = excluded.player_id, drexel_user_id = excluded.drexel_user_id,
        request_type = excluded.request_type, display_name = null, requested_skill_level = null,
        created_at = statement_timestamp()
  returning id into request_id; return request_id;
end; $$;

create function public.submit_skill_change_request(p_skill_level public.skill_level)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid; target_id uuid; target_drexel_id text; current_level public.skill_level; request_id uuid;
begin
  caller = private.require_authenticated();
  select players.id, players.drexel_user_id, players.skill_level into target_id, target_drexel_id, current_level
  from public.player_identities join public.players on players.id = player_identities.player_id
  where player_identities.auth_user_id = caller for update;
  if target_id is null or target_drexel_id is null then raise exception 'An approved Drexel profile is required before requesting a skill change.' using errcode = '23514'; end if;
  if p_skill_level is null or p_skill_level = current_level then raise exception 'Choose a different skill level.' using errcode = '22023'; end if;
  insert into public.member_requests (auth_user_id, player_id, drexel_user_id, requested_skill_level, request_type)
  values (caller, target_id, target_drexel_id, p_skill_level, 'change_skill_level')
  on conflict (auth_user_id) where status = 'pending' do update
    set player_id = excluded.player_id, drexel_user_id = excluded.drexel_user_id,
        requested_skill_level = excluded.requested_skill_level, request_type = excluded.request_type,
        created_at = statement_timestamp()
  returning id into request_id; return request_id;
end; $$;

create function public.get_my_member_request()
returns table (id uuid, request_type public.member_request_type, status public.member_request_status, drexel_user_id text, display_name text, requested_skill_level public.skill_level, rejection_reason text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select id, request_type, status, drexel_user_id, display_name, requested_skill_level, rejection_reason, created_at
  from public.member_requests where auth_user_id = (select private.require_authenticated()) order by created_at desc, id desc limit 1;
$$;

create function public.list_member_requests_for_admin()
returns table (id uuid, request_type public.member_request_type, player_id uuid, drexel_user_id text, display_name text, current_skill_level public.skill_level, requested_skill_level public.skill_level, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query select requests.id, requests.request_type, requests.player_id, requests.drexel_user_id,
    coalesce(requests.display_name, players.display_name), players.skill_level, requests.requested_skill_level, requests.created_at
  from public.member_requests requests left join public.players on players.id = requests.player_id
  where requests.status = 'pending' order by requests.created_at, requests.id;
end; $$;

create function public.admin_review_member_request(p_request_id uuid, p_approve boolean, p_rejection_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare reviewer uuid; request_row public.member_requests; target_id uuid;
begin
  reviewer = private.require_admin();
  select * into request_row from public.member_requests where id = p_request_id for update;
  if request_row.id is null then raise exception 'Member request was not found.' using errcode = 'P0001'; end if;
  if request_row.status <> 'pending' then raise exception 'Member request has already been reviewed.' using errcode = '55000'; end if;
  if p_approve then
    if request_row.request_type in ('create_profile', 'link_new_device') and exists (select 1 from public.player_identities where auth_user_id = request_row.auth_user_id for update) then raise exception 'The requesting device already has an approved profile.' using errcode = '23514'; end if;
    if request_row.request_type = 'create_profile' then
      if exists (select 1 from public.players where drexel_user_id = request_row.drexel_user_id for update) then raise exception 'That Drexel User ID already has a profile.' using errcode = '23505'; end if;
      insert into public.players (drexel_user_id, display_name, skill_level) values (request_row.drexel_user_id, request_row.display_name, request_row.requested_skill_level) returning id into target_id;
    else
      select id into target_id from public.players where id = request_row.player_id and drexel_user_id = request_row.drexel_user_id for update;
      if target_id is null then raise exception 'The requested profile no longer matches this Drexel User ID.' using errcode = 'P0001'; end if;
      if request_row.request_type = 'change_skill_level' then update public.players set skill_level = request_row.requested_skill_level where id = target_id;
      else insert into public.player_identities (auth_user_id, player_id) values (request_row.auth_user_id, target_id); end if;
    end if;
    if request_row.request_type = 'create_profile' then insert into public.player_identities (auth_user_id, player_id) values (request_row.auth_user_id, target_id); end if;
  end if;
  update public.member_requests set status = case when p_approve then 'approved' else 'rejected' end,
    reviewed_by = reviewer, reviewed_at = statement_timestamp(), rejection_reason = case when p_approve then null else nullif(btrim(p_rejection_reason), '') end where id = request_row.id;
end; $$;

-- Existing join RPC remains compatible with the client signature but only permits an approved linked profile.
create or replace function public.join_current_queue(p_display_name text, p_skill_level public.skill_level)
returns table (queue_entry_id uuid, player_id uuid, session_id uuid, status public.queue_status)
language plpgsql security definer set search_path = '' as $$
declare caller_id uuid; active_session_id uuid; current_player_id uuid; current_queue_entry_id uuid; current_queue_status public.queue_status;
begin
  caller_id = private.require_authenticated();
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller_id::text, 0));
  select id into active_session_id from public.club_sessions where status = 'open' for update;
  if active_session_id is null then raise exception 'There is no open club session.' using errcode = 'P0001'; end if;
  select player_id into current_player_id from public.player_identities where auth_user_id = caller_id for update;
  if current_player_id is null then raise exception 'Your profile must be approved before joining the queue.' using errcode = '42501'; end if;
  if exists (select 1 from public.players where id = current_player_id and is_archived) then raise exception 'This member is archived and cannot join.' using errcode = '55000'; end if;
  insert into public.session_players (session_id, player_id, is_active) values (active_session_id, current_player_id, true)
    on conflict on constraint session_players_pkey do update set is_active = true;
  select id, status into current_queue_entry_id, current_queue_status from public.queue_entries
    where session_id = active_session_id and player_id = current_player_id and status in ('waiting','called','playing') for update;
  if current_queue_entry_id is null then insert into public.queue_entries (session_id, player_id, status, queued_at)
    values (active_session_id, current_player_id, 'waiting', statement_timestamp()) returning id, status into current_queue_entry_id, current_queue_status; end if;
  return query select current_queue_entry_id, current_player_id, active_session_id, current_queue_status;
end; $$;

revoke all on function private.normalize_drexel_user_id(text) from public, anon, authenticated;
revoke execute on function public.request_profile_link(uuid) from public, anon, authenticated;
revoke execute on function public.get_my_profile_link_request() from public, anon, authenticated;
revoke execute on function public.list_profile_link_requests() from public, anon, authenticated;
revoke execute on function public.review_profile_link_request(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.submit_create_profile_request(text, text, public.skill_level) from public, anon, authenticated;
revoke execute on function public.find_member_by_drexel_user_id(text) from public, anon, authenticated;
revoke execute on function public.submit_device_link_request(text) from public, anon, authenticated;
revoke execute on function public.submit_skill_change_request(public.skill_level) from public, anon, authenticated;
revoke execute on function public.get_my_member_request() from public, anon, authenticated;
revoke execute on function public.list_member_requests_for_admin() from public, anon, authenticated;
revoke execute on function public.admin_review_member_request(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.submit_create_profile_request(text, text, public.skill_level) to authenticated;
grant execute on function public.find_member_by_drexel_user_id(text) to authenticated;
grant execute on function public.submit_device_link_request(text) to authenticated;
grant execute on function public.submit_skill_change_request(public.skill_level) to authenticated;
grant execute on function public.get_my_member_request() to authenticated;
grant execute on function public.list_member_requests_for_admin() to authenticated;
grant execute on function public.admin_review_member_request(uuid, boolean, text) to authenticated;
