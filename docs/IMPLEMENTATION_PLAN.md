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
- [x] Add Cloudflare Pages SPA fallback file.
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
- [x] Confirm the repository's Cloudflare Pages build output and SPA routing configuration.
- [x] Complete production/preview environment, redirect URL, and optional custom-domain documentation.
- [x] Add production-bundle private-credential scanning.
- [x] Perform final code and manual checklist review.
- [x] Run final checks and report remaining manual steps.
- [x] Do not deploy, create a custom domain, commit, or push without explicit authorization and account access.
- [ ] Receive separate explicit authorization for commit, push, and deployment.
