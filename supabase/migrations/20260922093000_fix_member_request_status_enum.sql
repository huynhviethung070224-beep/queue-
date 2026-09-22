create or replace function public.admin_review_member_request(p_request_id uuid, p_approve boolean, p_rejection_reason text default null)
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
      insert into public.player_identities (auth_user_id, player_id) values (request_row.auth_user_id, target_id);
    else
      select id into target_id from public.players where id = request_row.player_id and drexel_user_id = request_row.drexel_user_id for update;
      if target_id is null then raise exception 'The requested profile no longer matches this Drexel User ID.' using errcode = 'P0001'; end if;
      if request_row.request_type = 'change_skill_level' then
        update public.players set skill_level = request_row.requested_skill_level where id = target_id;
      else
        insert into public.player_identities (auth_user_id, player_id) values (request_row.auth_user_id, target_id);
      end if;
    end if;
  end if;
  update public.member_requests
  set status = (case when p_approve then 'approved' else 'rejected' end)::public.member_request_status,
      reviewed_by = reviewer, reviewed_at = statement_timestamp(),
      rejection_reason = case when p_approve then null else nullif(btrim(p_rejection_reason), '') end
  where id = request_row.id;
end; $$;

revoke execute on function public.admin_review_member_request(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_review_member_request(uuid, boolean, text) to authenticated;
