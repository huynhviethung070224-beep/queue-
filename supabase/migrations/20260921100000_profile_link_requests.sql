create table public.profile_link_requests (
  id uuid primary key default gen_random_uuid(),
  requester_auth_user_id uuid not null references auth.users (id) on delete cascade,
  target_player_id uuid not null references public.players (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id),
  constraint profile_link_requests_status_check check (status in ('pending', 'approved', 'rejected')),
  constraint profile_link_requests_review_check check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null and reviewed_by is not null)
  )
);

create unique index profile_link_requests_one_pending_per_requester
  on public.profile_link_requests (requester_auth_user_id)
  where status = 'pending';

create index profile_link_requests_pending_created_idx
  on public.profile_link_requests (created_at)
  where status = 'pending';

alter table public.profile_link_requests enable row level security;
revoke all on table public.profile_link_requests from anon, authenticated;
grant select on table public.profile_link_requests to authenticated;

create policy profile_link_requests_requester_read
on public.profile_link_requests
for select to authenticated
using (requester_auth_user_id = (select auth.uid()));

create policy profile_link_requests_admin_read
on public.profile_link_requests
for select to authenticated
using ((select private.is_admin()));

create function public.request_profile_link(p_player_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  request_id uuid;
begin
  caller_id = private.require_authenticated();

  if exists (
    select 1 from public.player_identities
    where player_identities.auth_user_id = caller_id
  ) then
    raise exception 'This browser already has a linked profile.' using errcode = '23514';
  end if;

  if not exists (select 1 from public.players where players.id = p_player_id) then
    raise exception 'That profile no longer exists.' using errcode = 'P0001';
  end if;

  insert into public.profile_link_requests (requester_auth_user_id, target_player_id)
  values (caller_id, p_player_id)
  on conflict (requester_auth_user_id) where status = 'pending'
  do update set created_at = statement_timestamp()
  returning id into request_id;

  return request_id;
end;
$$;

create function public.get_my_profile_link_request()
returns table (
  id uuid,
  target_player_id uuid,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select requests.id, requests.target_player_id, requests.status, requests.created_at, requests.reviewed_at
  from public.profile_link_requests as requests
  where requests.requester_auth_user_id = (select private.require_authenticated())
  order by requests.created_at desc
  limit 1;
$$;

create function public.list_profile_link_requests()
returns table (
  id uuid,
  target_player_id uuid,
  target_display_name text,
  target_skill_level public.skill_level,
  status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select requests.id, requests.target_player_id, players.display_name, players.skill_level,
    requests.status, requests.created_at
  from public.profile_link_requests as requests
  join public.players on players.id = requests.target_player_id
  where requests.status = 'pending'
  order by requests.created_at, requests.id;
end;
$$;

create function public.review_profile_link_request(p_request_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer_id uuid;
  request_row public.profile_link_requests;
  existing_requester_player uuid;
begin
  reviewer_id = private.require_admin();

  select * into request_row
  from public.profile_link_requests
  where id = p_request_id
  for update;

  if request_row.id is null then
    raise exception 'Profile link request was not found.' using errcode = 'P0001';
  end if;
  if request_row.status <> 'pending' then
    raise exception 'Profile link request has already been reviewed.' using errcode = 'P0001';
  end if;

  if p_approve then
    select player_id into existing_requester_player
    from public.player_identities
    where auth_user_id = request_row.requester_auth_user_id
    for update;
    if existing_requester_player is not null then
      raise exception 'The requesting browser already has a linked profile.' using errcode = '23514';
    end if;

    delete from public.player_identities
    where player_id = request_row.target_player_id;
    insert into public.player_identities (auth_user_id, player_id)
    values (request_row.requester_auth_user_id, request_row.target_player_id);
  end if;

  update public.profile_link_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_at = statement_timestamp(), reviewed_by = reviewer_id
  where id = request_row.id;
end;
$$;

revoke execute on function public.request_profile_link(uuid) from public, anon, authenticated;
revoke execute on function public.get_my_profile_link_request() from public, anon, authenticated;
revoke execute on function public.list_profile_link_requests() from public, anon, authenticated;
revoke execute on function public.review_profile_link_request(uuid, boolean) from public, anon, authenticated;
grant execute on function public.request_profile_link(uuid) to authenticated;
grant execute on function public.get_my_profile_link_request() to authenticated;
grant execute on function public.list_profile_link_requests() to authenticated;
grant execute on function public.review_profile_link_request(uuid, boolean) to authenticated;
