# Manual Test Checklist

Record the environment, browser, tester, date, and result. Historical Phase 1 items describe the original interface preview; live member/admin items require the manually configured Supabase project.

## Phase 1 interface

- [ ] At 320 px width, the member form, queue, and court cards fit without horizontal page scrolling.
- [ ] At desktop width, the member page uses space clearly without excessive stretching.
- [ ] A name shorter than two characters shows a useful error.
- [ ] Joining changes the form to a personal waiting card.
- [ ] Leaving returns to the join form.
- [ ] Admin navigation opens the admin sign-in route.
- [ ] Exactly four players can be selected; a fifth cannot be added.
- [ ] Recommendation selection chooses four players.
- [ ] Calling players changes an available court to called.
- [ ] Start, cancel, end, enable, and disable controls show valid states.
- [ ] Closing a session, cancelling a call, ending a match, and removing a player use confirmation dialogs.
- [ ] Tab navigation reaches every interactive control with a visible focus indicator.
- [ ] Status remains understandable without relying only on badge color.
- [ ] Unknown URLs show the not-found page.

## Member lifecycle after Phase 3

## Drexel User ID approval onboarding

- [ ] A new anonymous browser submits a valid Drexel User ID/profile request and cannot join before approval.
- [ ] Admin approves a new-profile request; exactly one player and one device link are created.
- [ ] A new device finds an existing profile only by its exact Drexel User ID, then remains blocked until approval.
- [ ] Admin approval transfers the existing profile without changing player/payment/history and removes access from the previous browser.
- [ ] A transfer is rejected while the member is waiting, called, or playing, then succeeds after the active state ends.
- [ ] After legacy cleanup and every later approval, each player has at most one `player_identities` row.
- [ ] A skill-change request changes the existing player only after approval.
- [ ] `VH358` and `vh358` cannot create separate profiles.
- [ ] A non-admin cannot list or review another member's request.

- [ ] A new browser receives an anonymous session and joins once.
- [ ] Double-clicking **Join queue** creates only one active entry.
- [ ] Refresh while waiting restores the same player and queue entry.
- [ ] Refresh while called restores the assigned court alert.
- [ ] Refresh while playing restores the playing state.
- [ ] A waiting member can leave only their own queue entry.
- [ ] A called or playing member cannot leave through the waiting action.
- [ ] Disconnecting shows offline/reconnecting state.
- [ ] Reconnecting refetches and displays authoritative database state.

## Authorization and admin lifecycle after Phase 4

- [x] `npm run db:validate` reports 7 migrations, 10 RLS tables, and 14 state-change RPCs.
- [ ] Applying all migrations to a new Supabase project succeeds in filename order.
- [x] The `courts` table contains only Court 1, Court 2, and Court 3.
- [ ] After migration 7 is applied, the RLS audit reports `rowsecurity = true` for all ten application tables.
- [x] The security-definer audit shows an empty `search_path` for every security-definer function.
- [x] `anon` and `authenticated` have no direct insert, update, or delete table privileges.
- [x] Anonymous member direct writes to protected tables fail.
- [x] Anonymous member calls to admin RPC functions fail.
- [ ] A signed-in email/password user absent from `admin_users` remains unauthorized.
- [ ] Changing local/session storage does not grant admin access.
- [ ] An authorized admin can perform each documented admin RPC.
- [ ] A valid email/password user absent from `admin_users` is redirected away from `/admin`.
- [ ] Double-clicking create, open, assign, start, cancel, end, edit, remove, or court controls sends only one mutation while pending.
- [ ] Creating a draft and opening it makes the session visible to member browsers.
- [ ] Assigning four waiting players changes one available court and all four members to called.
- [ ] Cancelling a call restores original queue times; starting and ending a match updates all four records together.
- [ ] Ending with requeue enabled inserts four new waiting entries; disabling it leaves them inactive.
- [ ] Signing out removes only the current browser session and returns to the admin login.
- [ ] No Auth UUID or service-role credential appears in the UI or built assets.

## Required concurrency scenarios

Use the two-client procedure and expected database invariants in `CONCURRENCY_REVIEW.md`. These items require the owner-connected Supabase project and must not be inferred from unit or static tests.

- [ ] Two admins assign the same player simultaneously; only one assignment commits.
- [ ] Two admins assign the same court simultaneously; only one called match commits.
- [x] Two simultaneous Join Queue requests for one anonymous member leave only one active queue entry.
- [ ] A member refreshes while called or playing; identity and state remain correct.
- [ ] A client disconnects while state changes, reconnects, and receives authoritative state.
- [ ] Matches on multiple courts end close together; every game count and requeue entry is correct.

## Approved feedback 2–5 manual checks

Migrations 7 and 8 are now applied to the linked project. Items are checked only where the 2026-09-21 production verification exercised the exact behavior; credentialed admin and destructive lifecycle checks remain manual.

- [ ] Join once, leave/end the session, open a later session in the same browser origin, and confirm the same stable profile is restored and prefilled.
- [ ] Search a duplicate display name and confirm suggestions show skill/last-joined context without exposing payment or Auth UUIDs.
- [ ] Request ownership for an old-profile suggestion, confirm the pending request appears to the admin, and verify the member remains unlinked until approval.
- [ ] As admin, reject an ownership request and confirm the requester remains unlinked.
- [ ] As admin, verify the person in front of you, approve an ownership request, and confirm the requesting browser sees the old profile after refresh while the previous identity no longer owns it.
- [ ] After approval, confirm the member browser shows **Profile verified** and **Join live queue**, then confirm the name appears in the live queue only after the member presses that button.
- [ ] Create a genuinely new profile and confirm exactly one persistent player/identity/payment row exists, defaulting to Unpaid.
- [ ] Confirm a new browser/origin cannot claim an old profile by name. Cross-device linking remains unavailable pending the documented one-time-code design.
- [ ] As admin, search the persistent member directory, mark a member Paid, refresh/reopen a later session, and confirm Paid persists.
- [ ] As admin, confirm **Delete member** requires confirmation, deletes a disposable duplicate with no match history, and removes it from the directory.
- [ ] Confirm the delete RPC refuses a member with active queue state or match history.
- [ ] As admin, archive a member with match history, confirm it remains in historical records but disappears from member search, then restore it.
- [ ] Confirm an archived profile cannot create a new queue entry until restored.
- [x] As a member, confirm payment status/list is absent from the member UI and direct table reads plus admin directory/payment RPCs are denied; static validation confirms payment data is excluded from Realtime.
- [ ] Join as an Unpaid member and confirm joining succeeds, fairness position is unchanged, and admin receives one Unpaid notice.
- [ ] Trigger ordinary Realtime refetch/reconnect and confirm the same Unpaid join notice does not repeat in the current admin page session.
- [ ] Set the session default to 7 minutes, call/start matches on two courts at different times, and confirm independent countdowns.
- [ ] Change the default while a match is playing and confirm that running/called match duration does not reset or change; only later matches use the new value.
- [ ] Let a countdown reach zero and confirm `Time’s up` appears with no automatic End, game increment, lifecycle change, or requeue.
- [x] Confirm the production member page shows `Court 1 · Advanced`, `Court 2 · Beginner`, and `Court 3 · Intermediate`; authenticated admin display remains pending.
- [ ] Manually assign any valid skill group to any court and confirm labels do not block assignment or change recommendations.
- [x] Before the URL change, inventory other Workers, verify `drexel-queue` through Cloudflare, and record the account-wide subdomain effect.
- [x] After the authorized deploy, verify direct refresh for `/`, `/admin/login`, `/admin`, and `/not-a-route` on the exact new origin.
- [ ] Verify the Supabase Site URL and Redirect URLs in the dashboard against the exact new origin.
- [x] Verify and communicate that old-origin browser identity/storage does not transfer automatically to the new origin.

## Final release checks

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run db:validate`
- [x] `npm run build`
- [x] `npm run worker:dry-run`
- [x] `npm run deployment:validate`
- [x] `npm run security:scan-build`
- [x] Cloudflare Worker direct refresh works on `/admin`.
- [ ] Production Supabase redirect URLs and origins are verified.

## Phase 5 repository review record

Completed on 2026-08-25 against the local unconfigured application state:

- [x] Playwright browser review at 320 × 800 reports no horizontal page overflow.
- [x] Playwright browser review at 1440 × 900 reports no horizontal page overflow.
- [x] Member setup, admin setup, and unknown-route pages expose clear landmarks and headings.
- [x] The skip link receives first keyboard focus and transfers focus to `main`.
- [x] Browser console reports zero application errors and zero warnings after the favicon fix.
- [x] Dialog focus/Escape/restore and edit validation behavior are covered by automated component tests.
- [x] Repository lint, type checking, tests, migration validation, and production build pass.

This record does not mark the Supabase-dependent member, admin, RLS/RPC, Realtime, deployment, or true concurrency items above as complete.

## Phase 6 live test-project review record

Completed on 2026-08-25 against the owner-linked Supabase test project without printing private credentials:

- [x] All six expected migrations are applied; nine application tables have RLS; the three fixed courts exist; client roles have zero direct write privileges.
- [x] Every security-definer helper/RPC has an empty `search_path`; seven public live tables and no identity/admin tables are in the Realtime publication.
- [x] An authorized admin successfully invoked a protected session RPC inside a rolled-back transaction.
- [x] An anonymous member joined through the RPC, read the open queue and only their own identity, and could not write protected tables or invoke an admin RPC.
- [x] A clean Realtime client subscription reached `SUBSCRIBED` without a test write.
- [x] Simultaneous duplicate join requests produced the database invariant of one active queue entry; the temporary identity/player was removed afterward.
- [ ] Two-authorized-admin assignment and same-court races remain manual because the test project has only one authorized admin.
- [ ] Near-simultaneous multi-court completion/requeue remains manual because it needs seeded matches and multiple authorized admin clients.

All write-oriented validation used rollback where possible, and the duplicate-join test record was explicitly cleaned up. Passing this record does not replace browser lifecycle, deployed Cloudflare, or production Supabase URL checks.

## Phase 6 repository readiness record

Completed on 2026-08-25 with Node.js 24 and npm 11:

- [x] A clean `npm ci` completed with zero reported vulnerabilities.
- [x] GitHub Actions uses Node.js 24, `npm ci`, all required code/database checks, the production build, deployment-artifact validation, and bundle scanning.
- [x] `wrangler.jsonc` targets `dist` with `single-page-application` fallback, no incompatible `_redirects` file is emitted, and the build contains the SPA entry, JavaScript, and CSS artifacts.
- [x] The production bundle scan found no database URL/password, private key, Supabase secret key, or service-role JWT pattern.
- [x] Wrangler dry-run accepts the current `badminton` Worker configuration and packages `dist` without the previous infinite-loop redirect error.
- [x] Cloudflare Worker deployment succeeds and direct refresh serves the SPA on `/`, `/admin/login`, `/admin`, and an unknown route.
- [x] The deployed member route creates an anonymous Auth session, reads live state, denies an anonymous admin RPC, and recovers after an offline/reconnect cycle without baseline or post-reconnect browser errors.
- [ ] Production and Preview Workers Build triggers still need `NODE_VERSION`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`; until then, a Git-triggered build can overwrite the configured direct deployment with an unconfigured bundle.
- [ ] Production/preview Supabase Site URL and Redirect URLs still require the final deployed origins and Supabase account access.
- [ ] Optional custom domain and TLS verification remain intentionally unstarted.

## Feedback 2–5 deployment record

Built, migrated, and directly deployed on 2026-09-21; the feedback worktree remains uncommitted and unpushed:

- [x] Same-browser profile restoration remains bound to the existing anonymous Auth identity; old-profile search cannot mutate/link identities.
- [x] Payment is stored in a separate RLS table, defaults to Unpaid, is excluded from Realtime/member UI, and changes only through an admin-authorized RPC.
- [x] Payment fields do not enter the pure fairness/recommendation functions; automated coverage compares fairness under reversed payment values.
- [x] Match duration is persisted per session/match, copied only on match insert, and rendered as independent countdowns with no automatic lifecycle callback.
- [x] Court guidance labels are centralized display configuration only.
- [x] `wrangler.jsonc` and deployment validation target Worker `badminton`; Cloudflare account subdomain is `drexel-queue` and the final origin is deployed.
- [x] Clean `npm ci`, lint, type checking, 56 automated tests, database validation, production build, Worker dry-run, deployment validation, bundle-secret scan, and `git diff --check` pass.
- [x] The live member route has no horizontal overflow at 320 × 800, restores correctly after refresh, and reports no browser console warning/error.
- [x] Offline mode shows last-known state and disables member mutations; reconnect removes the warning, restores controls, and reaches a clean Realtime subscription.
- [x] Anonymous Auth, profile search, protected admin-RPC denial, payment-table RLS, and Realtime subscription pass against the linked Supabase project.
- [x] `/admin` redirects an unauthenticated browser to `/admin/login`, and both routes survive direct refresh.
- [x] The deployed member UI shows existing-profile suggestions and the new **Request ownership** action without linking by name.
- [ ] Credentialed admin directory/payment/countdown controls still require the owner's admin password for production browser verification.
- [ ] Cloudflare Production/Preview Git-build variables and Supabase Site URL/Redirect URLs still require dashboard verification.

## Supabase error remediation record

Completed on 2026-09-22 against the linked project with all test writes wrapped in transactions and rolled back:

- [x] Postgres logs identified the historical `join_current_queue` failures as SQLSTATE `42702`: three failures from the unqualified open-session `status` lookup and four from `returning id, status`.
- [x] No SQLSTATE `42702` or matching ambiguous-status error appears after migration `20260922100000_fix_join_queue_returning_ambiguity`.
- [x] Joining twice as one approved member returns the same active queue entry; leaving clears that active state.
- [x] Four temporary waiting members can be assigned atomically to a court and a cancelled call restores all four to waiting; the transaction rollback left no test rows.
- [x] All 12 live public tables have RLS enabled, and the three active-state unique indexes exist.
- [x] Migration `20260922110000_harden_member_admin_rpc_grants` removed accidental `anon`/`PUBLIC` execution of `list_members_for_admin`; only authenticated, service-role, and owner execution remain.
- [x] The deployed client validates a stored anonymous Auth session before protected reads and replaces only sessions confirmed invalid.
- [x] Admin member controls visibly disable archive/delete while a member has an active queue or match state.
- [x] The deployed home page and direct `/admin` refresh return HTTP 200 on `https://badminton.drexel-queue.workers.dev`.
- [ ] A genuine two-connection simultaneous join/assignment stress test remains manual because Docker was unavailable and the rollback fixtures used one database connection.
- [ ] Historical dashboard error counts remain visible until their selected log window expires; they cannot and should not be deleted.
