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

- [x] `npm run db:validate` reports 6 migrations, 9 RLS tables, and 12 state-change RPCs.
- [ ] Applying all migrations to a new Supabase project succeeds in filename order.
- [x] The `courts` table contains only Court 1, Court 2, and Court 3.
- [x] The RLS audit query reports `rowsecurity = true` for all nine application tables.
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

## Final release checks

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run db:validate`
- [x] `npm run build`
- [x] `npm run worker:dry-run`
- [x] `npm run deployment:validate`
- [x] `npm run security:scan-build`
- [ ] Cloudflare Worker direct refresh works on `/admin`.
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
- [x] Wrangler dry-run accepts the `queue` Worker configuration and packages `dist` without the previous infinite-loop redirect error.
- [ ] Cloudflare Worker deployment and direct-route refresh require verification after the routing fix is pushed.
- [ ] Production/preview Supabase Site URL and Redirect URLs still require the final deployed origins and Supabase account access.
- [ ] Optional custom domain and TLS verification remain intentionally unstarted.
