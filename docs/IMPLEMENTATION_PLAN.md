# Implementation Plan

This is the running project checklist. Work only on an explicitly approved phase and stop before the next phase.

## Phase 0 — Inspection and planning

- [x] Inspect workspace.
- [x] Confirm the repository started empty.
- [x] Define architecture and file plan.
- [x] Identify blockers.
- [x] Receive approval for Phase 1.

## Phase 1 — Foundation and static UI

- [x] Initialize Vite with React and TypeScript.
- [x] Enable strict TypeScript checks.
- [x] Add React Router routes for member, admin login, admin, and not found.
- [x] Add Tailwind design tokens and reusable UI styles.
- [x] Add Lucide icons.
- [x] Add ESLint.
- [x] Add Vitest, jsdom, and React Testing Library.
- [x] Add central application and club configuration.
- [x] Add realistic typed queue, court, match, and session mock data.
- [x] Build responsive member join, personal status, queue, and court interfaces.
- [x] Build responsive admin login and dashboard interfaces.
- [x] Demonstrate selection, court lifecycle, session controls, edit/remove, and confirmations with local state.
- [x] Add the original Pages SPA fallback file (replaced by Workers SPA routing when the owner selected a Worker deployment in Phase 6).
- [x] Create required repository documentation and `AGENTS.md`.
- [x] Add major UI-state tests.
- [x] Run and pass final lint, type checking, test, and production build checks.
- [x] Stop and receive approval for Phase 2.

## Phase 2 — Database and security

- [x] Add Supabase browser client setup and generated database-facing types.
- [x] Create timestamped schema migrations.
- [x] Add enums, tables, constraints, partial indexes, and the three court seeds.
- [x] Add RLS policies and restricted grants.
- [x] Add member and admin authorization helpers.
- [x] Add atomic RPC functions with row locking.
- [x] Document initial Supabase/admin setup without real secrets.
- [x] Run database validation and all repository checks, then stop.
- [x] Stop and receive approval for Phase 3.

The Phase 2 owner-activation step was later completed against the linked test project through migration 6. A separate production project and its account settings still require release authorization.

## Phase 3 — Member flow and Realtime

- [x] Add anonymous authentication and identity restoration.
- [x] Join and leave through RPC functions.
- [x] Load current session, personal state, live queue, and courts.
- [x] Add focused Realtime subscriptions and cleanup.
- [x] Refetch authoritative state after reconnect.
- [x] Add loading, empty, offline, reconnecting, and server-error states.
- [x] Add tests, run checks, and stop.
- [x] Stop and receive approval for Phase 4.

## Phase 4 — Admin and match lifecycle

- [x] Replace preview login with Supabase email/password Auth.
- [x] Protect routes and operations with database admin membership.
- [x] Connect session, court, player, and match controls to RPC functions.
- [x] Implement assign, call, start, cancel, end, and auto-requeue flows.
- [x] Prevent duplicate submissions and show useful feedback.
- [x] Add tests, run checks, and stop.
- [x] Stop and receive approval for Phase 5.

## Phase 5 — Fairness, quality, and concurrency

- [x] Complete pure TypeScript fairness and recommendation functions.
- [x] Add every required algorithm test.
- [x] Review RLS, RPC security, accessibility, validation, and responsive layout.
- [x] Review race conditions, document the locking analysis, and add static concurrency safeguards.
- [x] Execute safe live single-admin/member RLS, RPC, Realtime, and duplicate-join validation against the linked test project.
- [ ] Execute two-admin assignment/court races and multi-court completion races (requires a second authorized admin and seeded waiting players).
- [x] Run all repository checks and stop before Phase 6.
- [x] Stop and receive approval for Phase 6.

## Phase 6 — Deployment readiness

- [x] Add GitHub Actions CI using Node.js 24, `npm ci`, and the complete repository verification sequence.
- [x] Confirm Cloudflare build output and SPA routing configuration for the connected Worker Static Assets target.
- [x] Replace the incompatible Pages rewrite with Workers `single-page-application` routing and validate it with a Wrangler dry run.
- [x] Complete production/preview environment, redirect URL, and optional custom-domain documentation.
- [x] Add production-bundle private-credential scanning.
- [x] Perform final code and manual checklist review.
- [x] Run final checks and report remaining manual steps.
- [x] Do not deploy, create a custom domain, commit, or push without explicit authorization and account access.
- [x] Receive separate explicit authorization for commit, push, and deployment.
- [x] Apply migration 7 to the linked Supabase project and confirm all seven migration versions align.
- [x] Rename the Cloudflare account subdomain to `drexel-queue` and deploy the `badminton` Worker.
- [x] Verify direct route refresh, anonymous member Auth, member RLS/RPC denial, mobile layout, and Realtime reconnect on the final origin.
- [ ] Verify the credentialed admin dashboard and feedback controls with the owner's admin password.
- [ ] Review Cloudflare Git-build variables and Supabase Auth Site URL/Redirect URLs in their dashboards.

## Approved feedback 2–5 — implementation and deployment

- [x] Preserve stable same-browser member profiles across sessions and prefill restored profile data.
- [x] Add minimal old-profile name search/disambiguation without permitting name-only identity claims or merges.
- [x] Document the required secure one-time confirmation design before any cross-device profile linking.
- [x] Add an admin-only persistent member directory and Paid/Unpaid status with new-member default Unpaid.
- [x] Show Unpaid badges and a one-time admin join notice without changing join eligibility or fairness.
- [x] Add a persisted seven-minute session default copied independently into each new match.
- [x] Show independent member/admin countdowns, `Time's up`, and retain explicit admin End behavior.
- [x] Add Court 1 Advanced, Court 2 Beginner, and Court 3 Intermediate guidance labels without restrictions.
- [x] Configure repository Worker name `badminton` and complete the `drexel-queue` account-subdomain transition.
- [x] Add automated coverage and update repository validators/documentation.
- [x] Apply migration 7 to the linked Supabase project.
- [x] Verify member loading/search, payment RLS denial, court labels, direct routes, responsive layout, and Realtime reconnect on the final Worker origin.
- [ ] Verify credentialed admin payment/timer flows and remaining lifecycle scenarios manually.
- [x] Rename the account subdomain, create/deploy the `badminton` Worker, and verify the final origin.
- [ ] Commit and push the current feedback 2–5 worktree (not authorized by the deployment-only follow-up request).

## Ownership verification follow-up

- [x] Add a pending profile-link request table with RLS and append-only migration.
- [x] Add member request and admin approve/reject RPCs with database authorization and row locking.
- [x] Add member request UI and admin ownership-request review UI.
- [ ] Test a real approved and rejected request with the owner's admin account.
- [x] Apply migration 8 and deploy the updated Worker after all automated checks passed.

## Admin member cleanup follow-up

- [x] Add an admin-only delete-member RPC with active-state and match-history safety guards.
- [x] Add a confirmation-gated Delete member action to the admin directory.
- [x] Apply migration 9 and deploy the updated Worker after all automated checks passed.
- [ ] Manually verify deleting a disposable duplicate profile with the owner's admin account.

## Archived member follow-up

- [x] Add persistent `is_archived` state while preserving match history.
- [x] Add admin Archive/Restore controls with confirmation and database authorization.
- [x] Prevent archived profiles from appearing in member search or joining new sessions.
- [x] Apply migrations 10–11 and deploy the updated Worker.
- [ ] Manually archive and restore a disposable member with the owner's admin account.
