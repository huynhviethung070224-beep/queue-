create or replace function public.admin_delete_member(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_ids uuid[];
begin
  perform private.require_admin();

  if not exists (select 1 from public.players where id = p_player_id for update) then
    raise exception 'Member was not found.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.queue_entries
    where player_id = p_player_id and status in ('waiting', 'called', 'playing')
  ) then
    raise exception 'A waiting, called, or playing member cannot be deleted. Resolve the active queue state first.' using errcode = '55000';
  end if;

  select coalesce(array_agg(distinct match_id), '{}') into match_ids
  from public.match_players
  where player_id = p_player_id;

  -- Remove complete matches that included this player. Their match_players,
  -- timers, and other player links cascade from the match deletion.
  delete from public.matches where id = any(match_ids);

  delete from public.players where id = p_player_id;
end;
$$;

revoke execute on function public.admin_delete_member(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_member(uuid) to authenticated;
