# AGENTS.md

Guidance for anyone making automated or manual changes to Badminton FairPlay Queue.

## Project structure

- `src/components`: reusable layout, feedback, and UI primitives
- `src/config`: club-wide and application-wide configuration
- `src/features`: domain modules for member, admin, queue, courts, matches, auth, and sessions
- `src/pages`: route-level components
- `src/types`: shared TypeScript domain types
- `src/test`: global test setup
- `supabase/migrations`: append-only PostgreSQL migrations, beginning in Phase 2
- `docs`: product, architecture, setup, deployment, and test documentation
- `public`: static assets and Cloudflare Pages SPA routing fallback

## npm commands

```bash
npm run dev        # Local Vite server
npm run lint       # ESLint, with zero warnings allowed
npm run typecheck  # TypeScript project checks
npm run test       # Vitest test suite once
npm run test:watch # Vitest in watch mode
npm run build      # Type checking plus production Vite build
npm run db:validate # Static migration safety and completeness checks
npm run deployment:validate # CI, Node 24, SPA fallback, and dist checks
npm run security:scan-build # Scan dist for private credential patterns
npm run preview    # Preview a completed production build
```

## Coding conventions

- Keep TypeScript strict. Do not bypass type errors with `any` or unsafe assertions.
- Prefer small, named components and pure functions over giant page components.
- Keep domain behavior inside its feature folder; keep pages focused on composition.
- Keep Supabase member access behind `MemberService`; Realtime events invalidate and refetch snapshots rather than directly mutating authoritative client state.
- Keep Supabase admin Auth, reads, RPC calls, and Realtime access behind `AdminService`; UI route guards are usability controls, while PostgreSQL admin checks remain authoritative.
- Keep fairness and automatic group-selection rules pure and deterministic in `src/features/queue/fairness.ts`. Member/admin sorting and recommendation UI must call that shared source of truth rather than copy its comparator.
- An automatic recommendation must contain the highest-priority waiting player, must never combine beginner with advanced, and must return `null` instead of bypassing that player for a later compatible group. Manual admin overrides must remain visibly labeled.
- Use semantic HTML, explicit labels, visible focus states, and comfortable touch targets.
- Do not use color as the only status indicator.
- Use Lucide for interface icons. Do not add a large UI component library.
- Preserve the central names and club settings in `src/config/app.ts`.
- Keep mock-only behavior clearly labeled until it is replaced.
- Avoid speculative abstractions and dependencies.
- Add tests for business rules and important state transitions.

## Database security requirements

- Enable RLS on every exposed Supabase table.
- Never treat a frontend flag, route, email domain, local storage, or editable user metadata as authorization.
- Authorize admins by checking `auth.uid()` against `admin_users` in the database.
- Members may mutate only their own state through approved policies or RPC functions.
- Important multi-row transitions must use atomic RPC functions and row locking.
- Every security-definer function must set a safe `search_path`, validate input, and check caller identity.
- Revoke broad default function/table permissions; grant only required operations.
- Frontend recommendations are advisory. The database must revalidate players, court availability, and match invariants.
- Never expose or commit a Supabase service-role key.

## Secrets and migrations

- Secrets must never be committed, logged, printed, placed in screenshots, or added to documentation.
- The frontend may use only the public Supabase URL and anon key through the documented `VITE_` variables.
- Never silently rewrite a migration after it has been applied anywhere. Add a new timestamped migration instead.
- Do not hardcode an admin email, password, Auth UUID, project URL, or private key.

## Checks required before completion

Run the complete verification sequence and report the actual results:

```bash
npm run lint
npm run typecheck
npm run test
npm run db:validate
npm run build
npm run deployment:validate
npm run security:scan-build
```

Also verify the relevant items in `docs/MANUAL_TEST_CHECKLIST.md`. Do not claim that a check passed unless it was run.

## Definition of done

A change is complete only when:

- Its approved acceptance criteria are implemented without silently expanding scope.
- Security-sensitive state is enforced in the database, not only in the interface.
- Tests cover important success, failure, and concurrency behavior appropriate to the phase.
- Member and admin interfaces work at phone and desktop widths.
- Accessibility basics are preserved.
- No real secret is present.
- Documentation matches actual behavior.
- Lint, type checking, tests, and production build pass.
- Changed files, verification results, manual steps, known limitations, and the next recommended prompt are reported.
