begin;

-- Phase 3 publishes only the tables that drive the member live view.
-- Identity and admin tables deliberately remain outside Realtime.
do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'club_sessions',
    'players',
    'session_players',
    'queue_entries',
    'courts',
    'matches',
    'match_players'
  ]
  loop
    if not exists (
      select 1
      from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = relation_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        relation_name
      );
    end if;
  end loop;
end;
$$;

commit;
