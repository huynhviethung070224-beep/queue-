# Cloudflare Workers Deployment

The production target is the Git-connected Cloudflare Worker named `queue`. It hosts the Vite SPA with Workers Static Assets and communicates directly with Supabase. No custom domain is configured.

## Repository settings

- Production branch: `main`
- Install command: `npm ci`
- Build command: `npm run build`
- Build output: `dist`
- Deploy command: `npx wrangler deploy`
- Runtime: Node.js 24
- Worker configuration: `wrangler.jsonc`
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

## Supabase Auth URL configuration

After the Worker deploys successfully, copy its exact HTTPS origin. In **Supabase Dashboard > Authentication > URL Configuration**:

1. Set **Site URL** to the exact canonical Worker origin.
2. Add the exact production origin/path needed by Auth to **Redirect URLs**.
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

## Remaining manual concurrency checks

The linked test project has one authorized admin. Two-admin same-player assignment, same-court assignment, duplicate lifecycle transition, and near-simultaneous multi-court completion remain manual release gates. Do not mark them complete without a second authorized admin and recorded database postconditions.
