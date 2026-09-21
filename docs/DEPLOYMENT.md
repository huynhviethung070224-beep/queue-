# Cloudflare Workers Deployment

The current deployed production origin is `https://badminton.drexel-queue.workers.dev`. Migration 7 is applied to the linked Supabase project, Cloudflare accepted the account subdomain `drexel-queue`, and the `badminton` Worker was deployed directly on 2026-09-21. The former exact origin under `huynhviethung070224.workers.dev` no longer resolves after the account-wide subdomain change. No custom paid domain is in scope.

## Repository settings

- Production branch: `main`
- Install command: `npm ci`
- Build command: `npm run build`
- Build output: `dist`
- Deploy command: `npx wrangler deploy`
- Runtime: Node.js 24
- Worker configuration: `wrangler.jsonc`
- Deployed Worker name: `badminton`
- SPA fallback: `assets.not_found_handling = "single-page-application"`

Workers Static Assets does not support the Pages-style `/* /index.html 200` rewrite. That rule is treated as an infinite redirect. The Worker must use `not_found_handling` instead, and the production build must not contain `_redirects`.

## Verification commands

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run db:validate
npm run build
npm run worker:dry-run
npm run deployment:validate
npm run security:scan-build
```

`npm run deploy` performs a fresh build and deploys the configured Worker. Cloudflare Builds may run the build and deploy commands separately for a Git-triggered deployment.

The bundle scanner rejects private-key material, database URLs/password assignments, Supabase secret keys, and service-role JWTs. The Supabase project URL and browser publishable/anon key are intentionally public and appear in browser assets when configured; RLS and RPC authorization protect the data.

## GitHub Actions

`.github/workflows/ci.yml` runs on pushes to `main`, pull requests, and manual dispatch. It uses Node.js 24, installs exactly `package-lock.json` with `npm ci`, and runs every repository release check. CI has no database password, service-role key, or admin password.

## Cloudflare build variables

Configure the production and preview build environments with only:

```text
NODE_VERSION=24
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_BROWSER_KEY
```

Never add a database password, service-role/secret key, admin password, or other private credential. Every `VITE_` value is embedded into browser JavaScript.

Preferred isolation uses a dedicated production Supabase project and a separate preview/test project. If Production and Preview temporarily share the linked test project, both deployments share club data, anonymous users, and the admin allowlist; do not test destructive flows against real sessions.

## workers.dev name and account subdomain

The URL is composed from two independent values:

```text
https://<worker-name>.<account-workers-dev-subdomain>.workers.dev
```

- Repository-controlled: `wrangler.jsonc` sets `name` to `badminton`.
- Cloudflare account-controlled: the Workers account subdomain is now `drexel-queue`.
- Deployment-controlled: the Worker is deployed directly; Git-triggered Production/Preview build variables still require dashboard verification.

Changing the account-level `workers.dev` subdomain changed the public namespace for every Worker in the Cloudflare account, not only this app. Cloudflare accepted `drexel-queue`; the old exact URLs should be treated as retired.

The authorized deployment followed this sequence:

1. Inventoried the account and found the existing `queue` Worker before creating `badminton`.
2. Changed the account subdomain to `drexel-queue` and deployed `badminton` with only public Supabase browser configuration.
3. Verified `/`, `/admin/login`, `/admin`, and an unknown route by direct request/refresh.
4. Verified anonymous Auth, member reads/search, member denial of admin RPC/payment data, responsive layout, and Realtime reconnect.
5. Retained Supabase Site URL/Redirect URL review and credentialed admin feedback-flow testing as manual account checks.

The old exact origin may not remain available after an account-subdomain rename. A later redirect also cannot transfer Supabase Auth/local storage: browser storage is origin-scoped. Members arriving at the new origin receive a new anonymous Auth identity, so their old profile will not auto-restore. Until the separately reviewed one-time profile-claim flow exists, keep the old origin available when possible and tell members that the new origin may create a new profile. Do not merge records by display name.

## Supabase Auth URL configuration

Use the exact production origin `https://badminton.drexel-queue.workers.dev`. In **Supabase Dashboard > Authentication > URL Configuration**:

1. Set **Site URL** to the exact canonical Worker origin only after Cloudflare confirms it.
2. Add the exact production origin/path needed by Auth to **Redirect URLs**. During a safe transition, retain the old exact origin only while it still serves the app.
3. Keep a required local development entry such as `http://localhost:5173/**` only for development.
4. Add a narrowly scoped preview URL pattern only when preview Auth callbacks are required. Never use a global `https://**` pattern.

The current email/password login does not supply a custom `redirectTo`, but Site URL remains the safe default for future confirmation, recovery, passwordless, or OAuth flows.

## Deployed verification

Open and hard-refresh:

- `/`
- `/admin/login`
- `/admin`
- `/not-a-route`

`/admin` must load the SPA instead of a Cloudflare 404, after which application authorization may redirect an unauthenticated user. The unknown route must render the application's not-found page.

Then verify:

- A new browser creates/restores an anonymous member and reads the live queue.
- The authorized admin can sign in and load the dashboard.
- An anonymous member cannot invoke an admin RPC or write protected tables.
- Realtime reaches subscribed state and reconnect refetches authoritative data.
- No private credential or Auth UUID appears in delivered assets.

## Optional custom domain

Do not add a custom domain unless separately authorized. If approved later, add it from the Worker's **Domains** section, wait for TLS, update Supabase Site URL and Redirect URLs, and repeat every Auth and route-refresh check.

The deployed `badminton.drexel-queue.workers.dev` address is a Cloudflare-provided `workers.dev` address, not a purchased custom domain.

## Remaining manual concurrency checks

The linked test project has one authorized admin. Two-admin same-player assignment, same-court assignment, duplicate lifecycle transition, and near-simultaneous multi-court completion remain manual release gates. Do not mark them complete without a second authorized admin and recorded database postconditions.
