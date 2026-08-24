# Architecture

## Overview

This is a single React SPA deployed to Cloudflare Pages. It will communicate directly with Supabase Auth, PostgreSQL RPC functions, and Realtime. There is no custom Express server.

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

## Current Phase 1 architecture

- Route composition lives in `src/App.tsx`.
- Shared header/footer layout lives in `src/components/layout`.
- Reusable visual primitives live in `src/components/ui`.
- Member, admin, court, auth, and queue modules live in `src/features`.
- Mock domain records live in `src/features/queue/mockData.ts`.
- Domain types live in `src/types/domain.ts`.
- `sessionStorage` protects the preview admin route only to demonstrate navigation. It is deliberately labeled as non-secure.

The current member state and admin changes are local React state. Refreshing intentionally resets these preview changes.

## Planned database model

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

## Planned state flow

1. UI requests an action through a narrowly scoped RPC.
2. The RPC validates `auth.uid()`, role, inputs, current session, players, and court.
3. The RPC locks relevant rows and applies the whole transition atomically.
4. PostgreSQL constraints revalidate invariants.
5. Realtime publishes committed database changes.
6. React refetches after reconnect so missed messages cannot leave stale authoritative state.

## Realtime boundaries

One owner per resource will subscribe only to the active session, its queue entries, active matches, and the three courts. Feature hooks will clean up channels when unmounted. Authentication identities and unrelated historical records are not subscription targets.

## Testing strategy

- Pure unit tests for fairness, recommendation, and validation.
- React Testing Library tests for member, admin, error, and route states.
- Database tests/manual SQL checks for RLS, constraints, RPC authorization, and atomicity.
- Manual concurrency and reconnect checks.

## Deliberately excluded

Redux, GraphQL, microservices, Docker, a custom server, and large UI frameworks are excluded because they add operational or conceptual cost without solving an MVP requirement.
