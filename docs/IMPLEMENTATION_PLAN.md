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
- [ ] Stop and receive approval for Phase 2.

## Phase 2 — Database and security

- [ ] Add Supabase browser client setup and generated database-facing types.
- [ ] Create timestamped schema migrations.
- [ ] Add enums, tables, constraints, partial indexes, and the three court seeds.
- [ ] Add RLS policies and restricted grants.
- [ ] Add member and admin authorization helpers.
- [ ] Add atomic RPC functions with row locking.
- [ ] Document and verify initial Supabase/admin setup without real secrets.
- [ ] Run available checks and stop.

## Phase 3 — Member flow and Realtime

- [ ] Add anonymous authentication and identity restoration.
- [ ] Join and leave through RPC functions.
- [ ] Load current session, personal state, live queue, and courts.
- [ ] Add focused Realtime subscriptions and cleanup.
- [ ] Refetch authoritative state after reconnect.
- [ ] Add loading, empty, offline, reconnecting, and server-error states.
- [ ] Add tests, run checks, and stop.

## Phase 4 — Admin and match lifecycle

- [ ] Replace preview login with Supabase email/password Auth.
- [ ] Protect routes and operations with database admin membership.
- [ ] Connect session, court, player, and match controls to RPC functions.
- [ ] Implement assign, call, start, cancel, end, and auto-requeue flows.
- [ ] Prevent duplicate submissions and show useful feedback.
- [ ] Add tests, run checks, and stop.

## Phase 5 — Fairness, quality, and concurrency

- [ ] Complete pure TypeScript fairness and recommendation functions.
- [ ] Add every required algorithm test.
- [ ] Review RLS, RPC security, accessibility, validation, and responsive layout.
- [ ] Review race conditions and complete manual concurrency tests.
- [ ] Run all checks and stop.

## Phase 6 — Deployment readiness

- [ ] Add GitHub Actions CI.
- [ ] Confirm Cloudflare Pages build and SPA routing configuration.
- [ ] Complete production environment, redirect URL, and custom domain documentation.
- [ ] Perform final code and manual checklist review.
- [ ] Run final checks and report remaining manual steps.
- [ ] Do not deploy without explicit authorization and access.
