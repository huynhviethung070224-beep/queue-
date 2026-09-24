-- Recreating this function in 20260921120000 restored PostgreSQL's default
-- PUBLIC execute privilege. Keep the RPC reachable only by signed-in callers;
-- the function's internal private.require_admin() check remains authoritative.
revoke execute on function public.list_members_for_admin(text) from public, anon, authenticated;
grant execute on function public.list_members_for_admin(text) to authenticated;
