# Badminton FairPlay Queue

A mobile-first queue and three-court management application for a small badminton club. The product is designed to distribute games fairly while still recommending reasonably compatible skill groups.

## Current status

Phase 6 deployment readiness is implemented locally. Members use anonymous Supabase Auth, and administrators use email/password Auth plus database allowlist authorization. Member and admin state comes from PostgreSQL, mutations use the security-definer RPC surface, and focused Realtime events trigger authoritative refetches. Pure TypeScript recommendations apply session fairness before skill compatibility. GitHub Actions, Node.js 24 pinning, Cloudflare Pages SPA artifacts, deployment validation, and production-bundle credential scanning are configured. No private Supabase credential or admin account detail is included in the repository.

## Stack

- React 19, TypeScript strict mode, and Vite
- React Router
- Tailwind CSS
- Lucide icons
- Vitest, React Testing Library, and jsdom
- ESLint
- npm
- Supabase JavaScript client and PostgreSQL migrations

The repository is ready for a separately authorized commit, push, and Cloudflare Pages setup. No commit, push, or deployment was performed as part of Phase 6.

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

## Current limitations

The linked test project has one authorized admin, so the two-admin race scenarios and the multi-court completion race remain manual release checks. Cloudflare Pages settings, production/preview variables, deployed route refreshes, and final Supabase production URLs also require account access after explicit deployment authorization. Follow `docs/CONCURRENCY_REVIEW.md` and `docs/DEPLOYMENT.md` before production use.
