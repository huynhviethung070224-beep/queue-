begin;

-- RLS policies run with the querying role. They need schema usage and execute
-- permission on the two read-only helpers referenced by policy expressions.
-- Keep mutation/authorization assertion helpers private to security-definer RPCs.
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.current_player_id() to authenticated;

commit;
