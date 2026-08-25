# Architecture

## Overview

This is a single React SPA deployed as Cloudflare Workers Static Assets. It communicates directly with Supabase Auth, PostgreSQL RPC functions, and Realtime. There is no custom Express server or application Worker code.

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

## Current Phase 6 architecture

- Route composition lives in `src/App.tsx`.
- Shared header/footer layout lives in `src/components/layout`.
- Reusable visual primitives live in `src/components/ui`.
- Member, admin, court, auth, and queue modules live in `src/features`.
- Mock domain records remain only as Phase 1 fixtures and are not runtime sources of truth.
- Domain types live in `src/types/domain.ts`.
- Supabase-generated-shape database types live in `src/types/database.ts`.
- `src/lib/supabase.ts` lazily creates typed member and admin browser clients with separate Auth storage keys, so staff sign-in cannot replace an anonymous member identity in the same browser.
- `src/features/member/memberService.ts` owns member Auth, reads, RPC calls, mapping, and one focused Realtime channel behind a mockable interface.
- `src/features/member/useMemberQueue.ts` owns loading/action state, subscription cleanup, offline detection, reconnect refetching, and live wait-time display.
- `src/features/admin/adminService.ts` owns email/password Auth, database membership checks, admin reads, RPC calls, data mapping, and one focused Realtime channel.
- `src/features/auth/AdminAuthContext.tsx` restores the admin session, follows Auth events, and exposes protected-route state without treating client state as authorization.
- `src/features/admin/useAdminDashboard.ts` owns authoritative admin snapshots, reconnect refreshes, feedback, and a synchronous duplicate-action guard.
- `src/features/queue/fairness.ts` is the single pure, deterministic source for priority sorting, one-court recommendation, and non-overlapping multi-court recommendations.
- Admin routes are lazy-loaded so the member entry bundle does not pay for protected dashboard code before navigation.
- Timestamped SQL migrations live in `supabase/migrations` and must remain append-only after use.
- `.github/workflows/ci.yml` reproduces the locked Node.js 24 verification sequence without requiring Supabase credentials.
- `wrangler.jsonc` points Workers Static Assets at `dist` and uses `not_found_handling: single-page-application`, so direct React Router route refreshes serve `index.html`.
- Deployment validation checks CI commands, runtime pinning, and built artifacts; a separate scanner rejects private credential patterns in `dist` while allowing the public browser configuration required by Supabase.

Member and admin pages use Supabase as their source of truth when public environment values are configured. Without them they render explicit setup states rather than silently using mock records.

## Fairness and compatibility algorithm

The comparator orders waiting records by games played, never-played status, earlier previous-match end time, earlier queue time, and stable ID. Skill never changes that base priority. A recommendation is valid only when it contains the highest-priority waiting player; the algorithm returns `null` rather than starving that player for a later compatible group.

The recommendation search prefers a four-player same-level combination. Its fallback accepts exactly two adjacent levels only when every player in one cohort crossing into the other level has waited at least the configured 15-minute threshold. Beginner and advanced are never automatically combined. Inputs are deduplicated without mutation, and the multi-court helper removes each selected ID before finding the next group.

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

The member service owns one channel. It listens to club sessions, courts, visible player records, and session-filtered queue/session-player/match records. Database events invalidate the local snapshot; they are not merged into it. The hook refetches authoritative state after events, the initial subscription, and browser reconnect, and removes the channel on cleanup. Authentication identities and admin records are not publication or subscription targets.

The admin service uses the same invalidation/refetch rule with its own single active-session channel. Auth events use a separate Supabase Auth subscription. Both subscriptions have one owner and explicit cleanup; neither subscribes to `admin_users` or `player_identities`.

## Admin authentication and actions

1. Supabase Auth restores or accepts an email/password session.
2. The client calls `is_current_user_admin()` before rendering protected controls.
3. A non-admin session is rejected and locally signed out after a login attempt.
4. Every mutation still calls a security-definer RPC that independently executes `private.require_admin()`; the route guard is not the security boundary.
5. The UI permits one pending mutation at a time, disables mutations while offline/reconnecting, and refetches after success.

## Testing strategy

- Pure unit tests for fairness, recommendation, and validation.
- React Testing Library tests for member, admin, error, and route states.
- Database tests/manual SQL checks for RLS, constraints, RPC authorization, and atomicity.
- Manual concurrency and reconnect checks.

The repository validator also checks that every admin state-change RPC calls `private.require_admin()`, member mutations require authentication, assignment retains its row locks, required active-state unique indexes exist, and clients cannot directly select `admin_users`. Detailed lock and manual scenario evidence is recorded in `docs/CONCURRENCY_REVIEW.md`.

CI performs the same locked install, lint, type, unit/component, migration, build, deployment-artifact, and bundle-secret checks used locally. It does not receive database credentials and therefore cannot replace the documented live Supabase or two-browser release checks.

## Deliberately excluded

Redux, GraphQL, microservices, Docker, a custom server, and large UI frameworks are excluded because they add operational or conceptual cost without solving an MVP requirement.
