# Security and Concurrency Review

Phase 5 reviewed the repository's RLS, RPC, validation, race, and concurrency design. Phase 6 then ran the safe single-admin/member portions against the owner-linked test project. Static checks, unit tests, RLS/RPC denial cases, a Realtime handshake, and the duplicate-member-join database invariant pass. The two-admin and multi-court scenarios remain owner-run acceptance checks.

## Enforced security boundaries

- All nine exposed application tables enable RLS, and `anon`/`authenticated` receive no direct table writes.
- Client roles cannot select `admin_users`; admin membership is exposed only as the boolean `is_current_user_admin()` result.
- Each admin state-change RPC calls `private.require_admin()`. Member join/leave calls require an authenticated identity and can affect only the current identity.
- Every security-definer function uses an empty `search_path` and schema-qualified relations. Execute privileges are revoked and selectively granted to `authenticated`.
- The browser's route guard and recommendation are advisory. RPC validation, row locks, constraints, and partial unique indexes are the authoritative boundary.

`npm run db:validate` statically guards these properties, including the required admin/member authorization calls, assignment locks, active queue/court/player unique indexes, and absence of client `admin_users` reads.

## Race-condition analysis

| Scenario | Serialization or invariant | Expected loser |
| --- | --- | --- |
| Same member joins twice | Per-Auth advisory transaction lock, open-session and active-entry row locks, partial unique active-entry index | Second request returns the existing active entry or waits and observes it |
| Same player assigned by two admins | Open-session lock serializes assignments; selected queue entries are locked in stable ID order; one-active-entry and unreleased-player indexes backstop | Second assignment fails because all four players are no longer waiting |
| Same court assigned by two admins | Open-session then court row lock; one-active-match-per-court index | Second assignment fails because the court is no longer available |
| Open two draft sessions | Global advisory transaction lock plus one-open-session partial unique index | Second open fails while another session is open |
| Start/cancel/end twice | Target match, court, and match-player rows are locked and lifecycle status is rechecked | Second transition fails because status already changed |
| End multiple courts together | Each transaction locks its own match/court/player set and atomically updates four queue, session-player, and match-player rows | Both may commit; each group increments exactly once |
| Remove while assigning | Both operations lock the active queue entry; assignment also rechecks that every selected entry is still waiting | One commits, the other fails its status/count validation |
| Close while assigning | Both lock the open club-session row; close rejects active matches and assignment rechecks the session | Operations serialize without a partially closed assignment |

Assignments intentionally serialize on the one open-session row. That reduces theoretical throughput but is acceptable for fewer than 50 club users and makes conflicting three-court operations easier to reason about. PostgreSQL rolls back the entire RPC when any affected-row count or deferred four-player constraint fails, so no partial call/start/end state should commit.

## Live two-client procedure

Prerequisites: apply migrations to a disposable Supabase project, enable anonymous sign-in, create two separate email/password admin users, add both Auth UUIDs to `admin_users`, and configure only the public URL/anon key locally. Never use the service-role key in the browser.

1. Open two isolated admin browser profiles and one or more member profiles.
2. Create/open a session, join at least eight members, and record queue-entry IDs, court statuses, games played, and queue times.
3. Trigger the same four-player assignment from both admin profiles as simultaneously as practical. Confirm exactly one called match and no duplicate active player.
4. Repeat with different player groups targeting the same court. Confirm exactly one active match on that court.
5. Double-click member join and inspect the database. Confirm one active queue entry for that member/session.
6. Start or cancel the same called match from both admins. Confirm one valid transition and one useful failure; cancelling must preserve original `queued_at` values.
7. End matches on two courts at nearly the same time. Confirm each involved player gains exactly one game, each match has four released match-player rows, each court becomes available, and auto-requeue creates one new waiting entry per player when enabled.
8. Disconnect a called/playing member, change state from admin, reconnect, and confirm the client refetches authoritative status.
9. Attempt direct table writes, admin RPC calls from an anonymous member, and admin access from a signed-in user absent from `admin_users`; all must fail.

Capture the Supabase project reference, tester, timestamp, both client outcomes, and post-operation row counts in `MANUAL_TEST_CHECKLIST.md`. Do not test against production first.

## Phase 6 live evidence and remaining limitation

On 2026-08-25, the linked disposable test project was checked without recording its reference or credentials in the repository:

- All expected migrations, nine RLS tables, three courts, restricted table grants, safe security-definer `search_path` settings, and public-only Realtime publication membership were confirmed.
- An authorized admin session passed its database membership check and invoked `create_club_session` inside a transaction that was rolled back.
- An anonymous member joined through `join_current_queue`, read public queue/court state and only its own private identity, and was denied both a direct protected-table write and an admin RPC.
- A clean Realtime client reached `SUBSCRIBED` without writing test data.
- Two simultaneous member join requests for one anonymous identity left exactly one active queue entry. The temporary Auth identity and player were then removed.

The live join test exposed an ambiguous `ON CONFLICT (session_id, player_id)` reference inside `join_current_queue`. The append-only migration `20260825153000_fix_join_queue_conflict_target.sql` replaces it with `ON CONFLICT ON CONSTRAINT session_players_pkey`; the migration was applied and the member checks then passed.

Only one authorized admin is available. Therefore this review does **not** claim that same-player assignment, same-court assignment, duplicate lifecycle transitions, or near-simultaneous multi-court completion passed with two authorized admin clients. Those scenarios remain a required manual gate before production use.
