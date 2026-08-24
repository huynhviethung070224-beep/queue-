# Badminton FairPlay Queue

A mobile-first queue and three-court management application for a small badminton club. The product is designed to distribute games fairly while still recommending reasonably compatible skill groups.

## Current status

Phase 2 is implemented: the React mock interface remains in place, and the repository now includes a typed Supabase client foundation plus append-only migrations for the schema, RLS, restricted grants, seeded courts, and atomic state-change RPC functions. No real Supabase project is connected yet, and the UI does not call Supabase until later phases.

## Stack

- React 19, TypeScript strict mode, and Vite
- React Router
- Tailwind CSS
- Lucide icons
- Vitest, React Testing Library, and jsdom
- ESLint
- npm
- Supabase JavaScript client and PostgreSQL migrations

Supabase Auth and Realtime UI flows will be connected in later approved phases.

## Local development

Requirements: Node.js 24 and npm 11 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The member interface is at `/`. Select **Admin** in the header to open the preview admin login. The prefilled preview values are intentionally not real credentials.

## Required checks

```bash
npm run lint
npm run typecheck
npm run test
npm run db:validate
npm run build
```

## Environment variables

Copy `.env.example` to `.env.local` only when Supabase work begins. Never commit `.env.local` or real keys. The future frontend is allowed to contain only:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Never place the Supabase service-role key in frontend code or a `VITE_` variable.

## Routes

- `/` — member queue
- `/admin/login` — admin login preview
- `/admin` — mock-protected admin dashboard
- Any unmatched path — not-found page

## Documentation

- [Product specification](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Supabase setup](docs/SUPABASE_SETUP.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Manual test checklist](docs/MANUAL_TEST_CHECKLIST.md)

## Important Phase 1 limitation

The current `sessionStorage` admin preview is a UI demonstration only. It is not authorization. The Phase 2 database RPCs perform real authorization checks, but the preview interface will not use them until Phase 4.
