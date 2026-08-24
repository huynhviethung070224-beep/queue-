# Manual Test Checklist

Record the environment, browser, tester, date, and result when these checks become available. Phase 1 items use local mock state; database and concurrency items begin after later phases.

## Phase 1 interface

- [ ] At 320 px width, the member form, queue, and court cards fit without horizontal page scrolling.
- [ ] At desktop width, the member page uses space clearly without excessive stretching.
- [ ] A name shorter than two characters shows a useful error.
- [ ] Joining changes the form to a personal waiting card.
- [ ] Leaving returns to the join form.
- [ ] Admin navigation opens the clearly labeled preview login.
- [ ] Preview sign-in opens the dashboard.
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

## Authorization after Phases 2 and 4

- [ ] `npm run db:validate` reports 3 migrations, 9 RLS tables, and 12 state-change RPCs.
- [ ] Applying all migrations to a new Supabase project succeeds in filename order.
- [ ] The `courts` table contains only Court 1, Court 2, and Court 3.
- [ ] The RLS audit query reports `rowsecurity = true` for all nine application tables.
- [ ] The security-definer audit shows an empty `search_path` for every security-definer function.
- [ ] `anon` and `authenticated` have no direct insert, update, or delete table privileges.
- [ ] Anonymous member direct writes to protected tables fail.
- [ ] Anonymous member calls to admin RPC functions fail.
- [ ] A signed-in email/password user absent from `admin_users` remains unauthorized.
- [ ] Changing local/session storage does not grant admin access.
- [ ] An authorized admin can perform each documented admin RPC.
- [ ] No Auth UUID or service-role credential appears in the UI or built assets.

## Required concurrency scenarios

- [ ] Two admins assign the same player simultaneously; only one assignment commits.
- [ ] Two admins assign the same court simultaneously; only one called match commits.
- [ ] A member double-clicks Join Queue; only one active queue entry exists.
- [ ] A member refreshes while called or playing; identity and state remain correct.
- [ ] A client disconnects while state changes, reconnects, and receives authoritative state.
- [ ] Matches on multiple courts end close together; every game count and requeue entry is correct.

## Final release checks

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run db:validate`
- [ ] `npm run build`
- [ ] Cloudflare Pages direct refresh works on `/admin`.
- [ ] Production Supabase redirect URLs and origins are verified.
