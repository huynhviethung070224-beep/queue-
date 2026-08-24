# Badminton FairPlay Queue

A mobile-first queue and three-court management application for a small badminton club. The product is designed to distribute games fairly while still recommending reasonably compatible skill groups.

## Current status

Phase 1 is implemented: the React interface, routes, local mock interactions, documentation, test setup, linting, and production build are available. No Supabase project or real authentication is connected yet. All displayed names, court states, and admin actions are mock data held in browser memory.

## Stack

- React 19, TypeScript strict mode, and Vite
- React Router
- Tailwind CSS
- Lucide icons
- Vitest, React Testing Library, and jsdom
- ESLint
- npm

Supabase PostgreSQL, Auth, and Realtime will be added in later approved phases.

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

The current `sessionStorage` admin preview is a UI demonstration only. It is not authorization. It must be replaced with Supabase Auth plus database authorization before the application can be used by a real club.
