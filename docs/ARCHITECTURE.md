# Architecture

## Overview

This is a single React SPA deployed to Cloudflare Pages. It will communicate directly with Supabase Auth, PostgreSQL RPC functions, and Realtime. There is no custom Express server.

```text
React + React Router
  ├── member and admin feature modules
  ├── pure fairness/recommendation functions
  ├── Supabase anonymous and email/password Auth
  ├── focused Realtime subscriptions
  └── secure PostgreSQL RPC functions
         ├── authorization and validation
         ├── row locking
         └── atomic match transitions
```

## Current Phase 2 architecture

- Route composition lives in `src/App.tsx`.
- Shared header/footer layout lives in `src/components/layout`.
- Reusable visual primitives live in `src/components/ui`.
- Member, admin, court, auth, and queue modules live in `src/features`.
- Mock domain records live in `src/features/queue/mockData.ts`.
- Domain types live in `src/types/domain.ts`.
- Supabase-generated-shape database types live in `src/types/database.ts`.
- `src/lib/supabase.ts` creates a typed browser client lazily after both public environment values are present.
- Timestamped SQL migrations live in `supabase/migrations` and must remain append-only after use.
- `sessionStorage` protects the preview admin route only to demonstrate navigation. It is deliberately labeled as non-secure.

The current member and admin pages still use local React mock state. This is intentional: Phase 2 establishes the database and security boundary but does not start Phase 3 member integration or Phase 4 admin integration.

## Database model

- `players`: club-visible display name and skill level
- `player_identities`: private mapping from Supabase Auth user to player
- `club_sessions`: session status and settings
- `session_players`: per-session games and last-match end time
- `queue_entries`: waiting/called/playing history
- `courts`: the three fixed court records
- `matches`: court and lifecycle state
- `match_players`: four player/queue-entry links per match
- `admin_users`: authorized Auth UUIDs

`player_identities` is separate so Realtime consumers can receive player display data without receiving other members' Auth UUIDs.

Shared readable tables do not store member or admin Auth UUIDs. `player_identities` is readable only by its owner, while `admin_users` has no client table-read grant. The frontend will check admin status through `is_current_user_admin()`.

## Database invariants

- A partial unique index permits only one open club session.
- A partial unique index permits only one waiting/called/playing queue entry per player and session.
- A partial unique index permits only one called/playing match per court.
- A partial unique index on unreleased `match_players` prevents a player from appearing in two active matches.
- Composite foreign keys guarantee that a match player, queue entry, player, and club session agree.
- Deferred constraint triggers require four distinct match players before a called/playing/completed transaction can commit.
- Check constraints enforce trimmed display names, status timestamps, lifecycle ordering, non-negative game counts, and court numbers 1 through 3.

## Security model

- All nine exposed application tables have RLS enabled.
- `anon` and `authenticated` receive no direct table-write grants.
- Signed-in anonymous members use Supabase's `authenticated` PostgreSQL role, just like permanent users.
- Shared club tables expose sanitized state for the open session; admins can also read history, while a member retains access to their own identity/history rows.
- Private identity mappings have an owner-only read policy.
- Admin membership is checked from `admin_users` inside private security-definer helpers.
- Every callable state-change function validates authentication, validates input, uses an empty `search_path`, and schema-qualifies application relations.
- Function execution is revoked by default and re-granted only to `authenticated` for the documented RPC surface.

## State-change RPC surface

Member operations:

- `join_current_queue`
- `leave_current_queue`

Admin operations:

- `create_club_session`, `open_club_session`, `close_club_session`
- `assign_players_to_court`
- `start_called_match`, `cancel_called_match`, `end_playing_match`
- `admin_remove_player`, `admin_update_player`
- `set_court_enabled`

Assignments and match transitions lock the session, court, match, queue, and player rows needed by that transition. The four queue entries are changed as one transaction. A cancelled call restores `waiting` without changing `queued_at`; ending a match updates all four game counts and optionally inserts four new waiting entries at the same end timestamp.

## State flow

1. UI requests an action through a narrowly scoped RPC.
2. The RPC validates `auth.uid()`, role, inputs, current session, players, and court.
3. The RPC locks relevant rows and applies the whole transition atomically.
4. PostgreSQL constraints revalidate invariants.
5. Realtime publishes committed database changes.
6. React refetches after reconnect so missed messages cannot leave stale authoritative state.

## Realtime boundaries

One owner per resource will subscribe only to the active session, its queue entries, active matches, and the three courts. Feature hooks will clean up channels when unmounted. Authentication identities and unrelated historical records are not subscription targets.

## Testing strategy

- Pure unit tests for fairness, recommendation, and validation.
- React Testing Library tests for member, admin, error, and route states.
- Database tests/manual SQL checks for RLS, constraints, RPC authorization, and atomicity.
- Manual concurrency and reconnect checks.

## Deliberately excluded

Redux, GraphQL, microservices, Docker, a custom server, and large UI frameworks are excluded because they add operational or conceptual cost without solving an MVP requirement.
