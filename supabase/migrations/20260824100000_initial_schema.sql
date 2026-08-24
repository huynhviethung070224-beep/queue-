begin;

create schema if not exists private;

create type public.skill_level as enum (
  'beginner',
  'intermediate',
  'advanced'
);

create type public.club_session_status as enum (
  'draft',
  'open',
  'closed'
);

create type public.queue_status as enum (
  'waiting',
  'called',
  'playing',
  'completed',
  'left',
  'removed'
);

create type public.court_status as enum (
  'disabled',
  'available',
  'called',
  'playing'
);

create type public.match_status as enum (
  'called',
  'playing',
  'completed',
  'cancelled'
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  skill_level public.skill_level not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_display_name_trimmed_check
    check (display_name = btrim(display_name)),
  constraint players_display_name_length_check
    check (char_length(display_name) between 2 and 40)
);

create table public.player_identities (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  player_id uuid not null unique references public.players (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.club_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status public.club_session_status not null default 'draft',
  timezone text not null default 'America/New_York',
  auto_requeue boolean not null default true,
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_sessions_name_trimmed_check check (name = btrim(name)),
  constraint club_sessions_name_length_check check (char_length(name) between 2 and 80),
  constraint club_sessions_timezone_check check (timezone = 'America/New_York'),
  constraint club_sessions_lifecycle_check check (
    (status = 'draft' and opened_at is null and closed_at is null)
    or (status = 'open' and opened_at is not null and closed_at is null)
    or (
      status = 'closed'
      and opened_at is not null
      and closed_at is not null
      and closed_at >= opened_at
    )
  )
);

create unique index club_sessions_one_open_idx
  on public.club_sessions ((true))
  where status = 'open';

create table public.session_players (
  session_id uuid not null references public.club_sessions (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  games_played integer not null default 0,
  last_match_ended_at timestamptz,
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, player_id),
  constraint session_players_games_played_check check (games_played >= 0)
);

create index session_players_player_session_idx
  on public.session_players (player_id, session_id);

create table public.courts (
  number smallint primary key,
  name text not null unique,
  status public.court_status not null default 'available',
  updated_at timestamptz not null default now(),
  constraint courts_number_check check (number between 1 and 3),
  constraint courts_name_check check (name = 'Court ' || number::text)
);

insert into public.courts (number, name, status)
values
  (1, 'Court 1', 'available'),
  (2, 'Court 2', 'available'),
  (3, 'Court 3', 'available');

create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  player_id uuid not null,
  status public.queue_status not null default 'waiting',
  queued_at timestamptz not null default now(),
  called_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint queue_entries_session_player_fk
    foreign key (session_id, player_id)
    references public.session_players (session_id, player_id)
    on delete cascade,
  constraint queue_entries_identity_unique unique (id, player_id, session_id),
  constraint queue_entries_timestamps_check check (
    (status = 'waiting' and called_at is null and started_at is null and ended_at is null)
    or (
      status = 'called'
      and called_at is not null
      and called_at >= queued_at
      and started_at is null
      and ended_at is null
    )
    or (
      status = 'playing'
      and called_at is not null
      and started_at is not null
      and called_at >= queued_at
      and started_at >= called_at
      and ended_at is null
    )
    or (
      status = 'completed'
      and called_at is not null
      and started_at is not null
      and ended_at is not null
      and called_at >= queued_at
      and started_at >= called_at
      and ended_at >= started_at
    )
    or (
      status in ('left', 'removed')
      and called_at is null
      and started_at is null
      and ended_at is not null
      and ended_at >= queued_at
    )
  )
);

create unique index queue_entries_one_active_per_player_idx
  on public.queue_entries (session_id, player_id)
  where status in ('waiting', 'called', 'playing');

create index queue_entries_live_queue_idx
  on public.queue_entries (session_id, status, queued_at, id);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.club_sessions (id) on delete restrict,
  court_number smallint not null references public.courts (number) on delete restrict,
  status public.match_status not null default 'called',
  called_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  requeued_on_completion boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_session_identity_unique unique (id, session_id),
  constraint matches_lifecycle_check check (
    (
      status = 'called'
      and started_at is null
      and ended_at is null
      and requeued_on_completion is null
    )
    or (
      status = 'playing'
      and started_at is not null
      and started_at >= called_at
      and ended_at is null
      and requeued_on_completion is null
    )
    or (
      status = 'completed'
      and started_at is not null
      and ended_at is not null
      and started_at >= called_at
      and ended_at >= started_at
      and requeued_on_completion is not null
    )
    or (
      status = 'cancelled'
      and started_at is null
      and ended_at is not null
      and ended_at >= called_at
      and requeued_on_completion is null
    )
  )
);

create unique index matches_one_active_per_court_idx
  on public.matches (court_number)
  where status in ('called', 'playing');

create index matches_session_status_idx
  on public.matches (session_id, status, called_at);

create table public.match_players (
  match_id uuid not null,
  session_id uuid not null,
  player_id uuid not null,
  queue_entry_id uuid not null,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (match_id, player_id),
  constraint match_players_match_session_fk
    foreign key (match_id, session_id)
    references public.matches (id, session_id)
    on delete cascade,
  constraint match_players_queue_player_session_fk
    foreign key (queue_entry_id, player_id, session_id)
    references public.queue_entries (id, player_id, session_id)
    on delete restrict,
  constraint match_players_release_check
    check (released_at is null or released_at >= created_at)
);

create unique index match_players_one_active_match_per_queue_entry_idx
  on public.match_players (queue_entry_id)
  where released_at is null;

create unique index match_players_one_active_match_per_player_idx
  on public.match_players (player_id)
  where released_at is null;

create index match_players_session_idx
  on public.match_players (session_id, match_id);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create trigger players_set_updated_at
before update on public.players
for each row execute function private.set_updated_at();

create trigger club_sessions_set_updated_at
before update on public.club_sessions
for each row execute function private.set_updated_at();

create trigger session_players_set_updated_at
before update on public.session_players
for each row execute function private.set_updated_at();

create trigger courts_set_updated_at
before update on public.courts
for each row execute function private.set_updated_at();

create trigger queue_entries_set_updated_at
before update on public.queue_entries
for each row execute function private.set_updated_at();

create trigger matches_set_updated_at
before update on public.matches
for each row execute function private.set_updated_at();

create function private.assert_match_has_four_players()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_match_id uuid;
  target_status public.match_status;
  player_count integer;
begin
  if tg_table_name = 'matches' then
    target_match_id = coalesce(new.id, old.id);
  else
    target_match_id = coalesce(new.match_id, old.match_id);
  end if;

  select matches.status
  into target_status
  from public.matches
  where matches.id = target_match_id;

  if target_status in ('called', 'playing', 'completed') then
    select count(*)
    into player_count
    from public.match_players
    where match_players.match_id = target_match_id;

    if player_count <> 4 then
      raise exception 'An active or completed match must contain exactly four players.'
        using errcode = '23514';
    end if;
  end if;

  return null;
end;
$$;

create constraint trigger matches_require_four_players
after insert or update of status on public.matches
deferrable initially deferred
for each row execute function private.assert_match_has_four_players();

create constraint trigger match_players_require_four_players
after insert or update or delete on public.match_players
deferrable initially deferred
for each row execute function private.assert_match_has_four_players();

commit;
