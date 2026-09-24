-- Treat requesting the profile already linked to this Auth identity as success.
-- A linked identity still cannot switch to a different member without first
-- starting a new anonymous browser identity.
create or replace function public.submit_device_link_request(p_drexel_user_id text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid;
  normalized_id text;
  target_id uuid;
  linked_player_id uuid;
  request_id uuid;
begin
  caller = private.require_authenticated();
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text, 0));
  normalized_id = private.normalize_drexel_user_id(p_drexel_user_id);

  select players.id
  into target_id
  from public.players
  where players.drexel_user_id = normalized_id
    and not players.is_archived
  for share;

  if target_id is null then
    raise exception 'No active profile was found for that Drexel User ID.' using errcode = 'P0001';
  end if;

  select player_identities.player_id
  into linked_player_id
  from public.player_identities
  where player_identities.auth_user_id = caller
  for update;

  if linked_player_id = target_id then
    return target_id;
  end if;

  if linked_player_id is not null then
    raise exception 'This browser is already linked to a different approved profile. Use a different profile first.' using errcode = '23514';
  end if;

  insert into public.member_requests (auth_user_id, player_id, drexel_user_id, request_type)
  values (caller, target_id, normalized_id, 'link_new_device')
  on conflict (auth_user_id) where status = 'pending' do update
    set player_id = excluded.player_id,
        drexel_user_id = excluded.drexel_user_id,
        request_type = excluded.request_type,
        display_name = null,
        requested_skill_level = null,
        created_at = statement_timestamp()
  returning member_requests.id into request_id;

  return request_id;
end;
$$;

revoke execute on function public.submit_device_link_request(text) from public, anon, authenticated;
grant execute on function public.submit_device_link_request(text) to authenticated;
