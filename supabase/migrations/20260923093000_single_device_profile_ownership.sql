-- A member profile belongs to one approved browser identity at a time. Keep the
-- newest existing link when cleaning up legacy multi-device rows.
with ranked_identities as (
  select
    player_identities.auth_user_id,
    row_number() over (
      partition by player_identities.player_id
      order by player_identities.created_at desc, player_identities.auth_user_id desc
    ) as device_rank
  from public.player_identities
)
delete from public.player_identities
using ranked_identities
where player_identities.auth_user_id = ranked_identities.auth_user_id
  and ranked_identities.device_rank > 1;

create unique index player_identities_one_device_per_player_idx
  on public.player_identities (player_id);

create or replace function public.admin_review_member_request(
  p_request_id uuid,
  p_approve boolean,
  p_rejection_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer uuid;
  request_row public.member_requests;
  target_id uuid;
  requesting_player_id uuid;
begin
  reviewer = private.require_admin();
  select member_requests.*
  into request_row
  from public.member_requests
  where member_requests.id = p_request_id
  for update;

  if request_row.id is null then
    raise exception 'Member request was not found.' using errcode = 'P0001';
  end if;
  if request_row.status <> 'pending' then
    raise exception 'Member request has already been reviewed.' using errcode = '55000';
  end if;

  if p_approve then
    select player_identities.player_id
    into requesting_player_id
    from public.player_identities
    where player_identities.auth_user_id = request_row.auth_user_id
    for update;

    if request_row.request_type = 'create_profile' then
      if requesting_player_id is not null then
        raise exception 'The requesting browser already has an approved profile.' using errcode = '23514';
      end if;
      if exists (
        select 1 from public.players
        where players.drexel_user_id = request_row.drexel_user_id
        for update
      ) then
        raise exception 'That Drexel User ID already has a profile.' using errcode = '23505';
      end if;
      insert into public.players (drexel_user_id, display_name, skill_level)
      values (request_row.drexel_user_id, request_row.display_name, request_row.requested_skill_level)
      returning players.id into target_id;
      insert into public.player_identities (auth_user_id, player_id)
      values (request_row.auth_user_id, target_id);
    else
      select players.id
      into target_id
      from public.players
      where players.id = request_row.player_id
        and players.drexel_user_id = request_row.drexel_user_id
      for update;

      if target_id is null then
        raise exception 'The requested profile no longer matches this Drexel User ID.' using errcode = 'P0001';
      end if;

      if request_row.request_type = 'change_skill_level' then
        if requesting_player_id is distinct from target_id then
          raise exception 'The requesting browser no longer controls this profile.' using errcode = '42501';
        end if;
        update public.players
        set skill_level = request_row.requested_skill_level
        where players.id = target_id;
      else
        if requesting_player_id is not null and requesting_player_id <> target_id then
          raise exception 'The requesting browser already belongs to a different profile.' using errcode = '23514';
        end if;
        if exists (
          select 1
          from public.queue_entries
          where queue_entries.player_id = target_id
            and queue_entries.status in ('waiting', 'called', 'playing')
          for update
        ) then
          raise exception 'This profile is active in the queue or a match. Transfer access after the member leaves.' using errcode = '55000';
        end if;

        perform 1
        from public.player_identities
        where player_identities.player_id = target_id
        for update;

        delete from public.player_identities
        where player_identities.player_id = target_id
          and player_identities.auth_user_id <> request_row.auth_user_id;

        insert into public.player_identities (auth_user_id, player_id)
        values (request_row.auth_user_id, target_id)
        on conflict (auth_user_id) do update
          set player_id = excluded.player_id;
      end if;
    end if;
  end if;

  update public.member_requests
  set status = (case when p_approve then 'approved' else 'rejected' end)::public.member_request_status,
      reviewed_by = reviewer,
      reviewed_at = statement_timestamp(),
      rejection_reason = case
        when p_approve then null
        else nullif(btrim(p_rejection_reason), '')
      end
  where member_requests.id = request_row.id;
end;
$$;

revoke execute on function public.admin_review_member_request(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_review_member_request(uuid, boolean, text) to authenticated;
