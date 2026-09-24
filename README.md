# Badminton FairPlay Queue

A mobile-first queue and three-court management application for a small badminton club. The product is designed to distribute games fairly while still recommending reasonably compatible skill groups.

## Current status

Phase 6 and the approved post-release feedback 2–5 are deployed at [badminton.drexel-queue.workers.dev](https://badminton.drexel-queue.workers.dev/). Members use anonymous Supabase Auth with same-browser profile restoration and safe existing-name discovery; selecting a name never claims that identity. Administrators have a private persistent member/payment directory. Matches copy a configurable seven-minute default into an independent persisted countdown, and the three court skill labels remain guidance only. Pure TypeScript fairness remains independent of payment and court labels. No private Supabase credential or admin account detail is included in the repository.

## Stack

- React 19, TypeScript strict mode, and Vite
- React Router
- Tailwind CSS
- Lucide icons
- Vitest, React Testing Library, and jsdom
- ESLint
- npm
- Supabase JavaScript client and PostgreSQL migrations

The reviewed Phase 3–6 baseline is committed and pushed. Migration 7 is applied to the linked Supabase project and the current feedback 2–5 worktree was deployed directly to the `badminton` Worker, but these feedback changes remain uncommitted and unpushed. A later Git-triggered Cloudflare build must not replace this direct deployment until the intended changes and build environment are reviewed and pushed.

## Local development

Requirements: Node.js 24 and npm 11 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The member interface is at `/`; select **Admin** for the protected dashboard. Both live routes require the public Supabase environment values and the manual project setup described below.

## Required checks

```bash
npm run lint
npm run typecheck
npm run test
npm run db:validate
npm run build
npm run deployment:validate
npm run security:scan-build
```

## Environment variables

Copy `.env.example` to `.env.local` when manually connecting a Supabase project. Never commit `.env.local` or real keys. The frontend is allowed to contain only:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Never place the Supabase service-role key in frontend code or a `VITE_` variable.

## Routes

- `/` — member queue
- `/admin/login` — Supabase email/password administrator login
- `/admin` — database-authorized admin dashboard
- Any unmatched path — not-found page

## Documentation

- [Product specification](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Supabase setup](docs/SUPABASE_SETUP.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Manual test checklist](docs/MANUAL_TEST_CHECKLIST.md)
- [Security and concurrency review](docs/CONCURRENCY_REVIEW.md)

## Drexel User ID onboarding

Member profiles use a normalized unique Drexel User ID. Supabase Anonymous Auth remembers the one browser currently approved for each profile. New profile creation, device transfer, and skill-level changes require an administrator to approve a request; members do not use passwords, email login, or PINs. A device transfer revokes the previous browser and is blocked while the member is active in the queue or a match.

## Current limitations

The Drexel User ID migration is local and has not been applied or deployed yet. Existing players without a Drexel User ID remain usable on their already-approved device until an administrator assigns an ID in a future follow-up. The linked project has one authorized admin, so approval flows, two-admin races, and the multi-court completion race still need manual verification. Cloudflare Production/Preview build variables and the Supabase Auth Site URL/Redirect URLs still require dashboard review.
# Drexel User ID onboarding

Member profiles use a normalized unique Drexel User ID. Supabase Anonymous Auth remembers the one browser currently approved for each profile. New profile creation, device transfer, and skill-level changes require an administrator to approve a request; members do not use passwords, email login, or PINs. A device transfer revokes the previous browser and is blocked while the member is active in the queue or a match.
