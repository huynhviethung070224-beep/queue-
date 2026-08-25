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

## Phase 3 acceptance criteria

- The member route restores a persisted Supabase session or creates an anonymous one.
- Current open session, personal queue state, fairness-ordered waiting list, active matches, and all three courts load from Supabase.
- Join and leave actions call the approved atomic RPC functions and block duplicate UI submissions while pending.
- Called and playing members retain prominent court/status information, and playing courts show a live elapsed timer without auto-ending.
- A single owned Realtime channel observes only member-visible live tables, applies active-session filters where supported, and is removed during cleanup.
- Realtime events, successful subscription, and browser reconnect trigger authoritative refetches rather than client-side database-event merging.
- Loading, no-open-session, unconfigured, offline, reconnecting, live-channel-error, RPC-error, and first-load server-error states are understandable.
- Automated tests cover join, leave, live-event refetch, subscription cleanup, reconnect, empty, configuration, and server-error behavior.

## Phase 4 acceptance criteria

- Admin login uses Supabase email/password authentication with no preview credentials or browser-storage authorization flag.
- Member and admin Auth sessions use separate client storage namespaces so one route cannot replace the other route's identity.
- Protected routes require both an authenticated non-anonymous session and a successful `is_current_user_admin()` database check.
- Failed database membership checks cannot render the dashboard, and every mutation remains protected independently inside its RPC.
- Admins can create and open draft sessions, close the active session, inspect the live fairness-ordered queue, edit/remove waiting players, and enable/disable available courts.
- Exactly four selected waiting players can be assigned atomically to an available court, then started, cancelled, or ended through the approved match RPCs.
- Ending a match explicitly passes the selected requeue behavior; the database updates all four players and entries atomically.
- Admin Auth and Realtime subscriptions have single owners and cleanup, and live events/reconnects trigger authoritative refetches.
- Pending or disconnected state prevents duplicate mutations and presents useful success/error feedback.
- Automated tests cover authorization rejection, secure sign-in, RPC mapping, protected routing, assignment, duplicate submission prevention, and Realtime cleanup.

## Phase 5 acceptance criteria

- Fairness sorting and group recommendation are pure deterministic TypeScript functions shared by member and admin flows.
- Automatic groups always include the highest-priority waiting player, prefer same-level groups, permit only threshold-qualified adjacent levels, never mix beginner with advanced, and return no recommendation when no fair compatible group exists.
- Multi-court recommendation produces no duplicate player IDs across the three courts and does not mutate its input.
- Unit tests cover every priority tie-break, same-level and adjacent-level behavior, threshold boundaries, invalid skill mixes, duplicate records, fewer than four waiters, starvation prevention, and three-court overlap prevention.
- RLS/RPC authorization, validation, unique invariants, row-locking strategy, duplicate submissions, and race scenarios receive a documented static review; live multi-client verification remains mandatory when the owner connects Supabase.
- Dialog focus is trapped and restored, Escape behavior respects pending mutations, validation errors are announced, skip navigation transfers focus, status is not color-only, and the reviewed routes do not overflow at 320 px or desktop width.
- Lint, strict type checking, tests, migration validation, and production build pass before Phase 6 begins.

## Phase 6 acceptance criteria

- GitHub Actions uses Node.js 24 and `npm ci`, then runs lint, type checking, tests, database validation, production build, deployment-artifact validation, and production-bundle credential scanning.
- The repository pins Node.js 24, builds with `npm run build`, emits `dist`, and copies `public/_redirects` so direct SPA route refreshes resolve to `index.html` on Cloudflare Pages.
- Production and preview environment documentation allows only the public Supabase URL and browser publishable/anon key; database passwords, service-role keys, and admin credentials never enter Cloudflare or the frontend bundle.
- Supabase production Site URL, exact production redirect URLs, narrowly scoped preview URL patterns, and optional custom-domain changes are documented as manual account steps.
- Live test-project validation records only observed RLS, RPC, member/admin, Realtime, and concurrency results. Two-admin scenarios remain open when a second authorized admin is unavailable.
- The complete local verification suite passes before a separately authorized commit, push, or deployment.
