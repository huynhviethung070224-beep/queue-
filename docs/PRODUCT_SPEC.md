# Product Specification

## Product

**Badminton FairPlay Queue** helps a badminton club with fewer than 50 simultaneous users share exactly three courts. It prioritizes fair playing time, then uses skill compatibility to make games more comfortable.

The configured club name is **Drexel Badminton Club**. Both names can be changed centrally in `src/config/app.ts`.

## Users

### Member

A member receives an anonymous Supabase Auth session rather than creating a visible account. They enter a display name and one of three skill levels: beginner, intermediate, or advanced.

Members can join the current open session, see their queue position and wait time, see games played, view the live queue and courts, leave while waiting, and recover their identity after refresh. Called and playing states must be prominent. Network interruption and reconnect states must be understandable.

Members cannot edit other players, change game counts, control courts or matches, or grant themselves admin access.

### Admin

Admins use Supabase email/password authentication. An Auth UUID must also exist in `admin_users` before any admin operation succeeds.

Admins manage sessions, courts, recommended/manual groups of four, the called/playing/completed lifecycle, auto-requeue, no-shows, duplicate entries, and player corrections. Destructive actions require confirmation.

## Club session rules

- At most one session is open.
- A session can be created, opened, and closed by an admin.
- Games played and fairness history are scoped to the club session.
- The configured club timezone is `America/New_York`; database timestamps remain UTC.

## Court and match rules

- Courts are fixed as Court 1, Court 2, and Court 3.
- A court is disabled, available, called, or playing.
- Only one called or playing match may occupy a court.
- A match contains exactly four distinct players.
- Called players can be returned to their original queue positions if the call is cancelled.
- Playing matches show elapsed time and do not end automatically.
- Ending a match updates game counts and rest time, then optionally requeues players.

## Fairness and recommendation

Base priority is:

1. Fewer games in the current session.
2. Never-played players before previously played players in the same game-count group.
3. Earlier previous-match end time.
4. Earlier queue entry.
5. Stable ID.

Skill does not improve priority. Recommendations prefer four players at the same level. A player waiting at least 15 minutes may be grouped with an adjacent level. Beginner and advanced are never automatically mixed. The algorithm returns no recommendation when four compatible players cannot be found. Manual admin overrides remain possible with a warning.

## Phase 1 acceptance criteria

- React, TypeScript, Vite, routing, Tailwind, ESLint, and Vitest are configured.
- Member, admin login, admin dashboard, and not-found routes render.
- Responsive interfaces show realistic queue, court, recommendation, and match states.
- Mock interactions demonstrate the intended workflow without Supabase.
- Major component states have automated tests.
- Documentation clearly distinguishes current mock behavior from future production behavior.
- Lint, type checking, tests, and production build pass.

## Phase 2 acceptance criteria

- A lazy, typed Supabase browser client exists without requiring real environment values during the mock phase.
- Timestamped, append-only migrations define all required tables and status enums.
- Exactly three courts are seeded and constrained to numbers 1 through 3.
- Database constraints prevent multiple open sessions, duplicate active queue entries, duplicate active court matches, and players appearing in multiple active matches.
- Deferred constraint triggers require exactly four distinct players in called, playing, and completed matches.
- Every exposed application table has RLS enabled and client roles receive no direct write grants.
- Anonymous and permanent Supabase users, both using the `authenticated` PostgreSQL role, can read only sanitized club state and their own private identity mapping.
- Admin authority comes only from `admin_users` and is rechecked by every admin RPC.
- Member joins/leaves and all admin state transitions use security-definer RPC functions with an empty `search_path`, input validation, and row locking.
- No Auth UUID is stored in tables exposed as shared live club state.
