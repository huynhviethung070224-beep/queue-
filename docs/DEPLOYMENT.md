# Cloudflare Pages Deployment Readiness

> Phase 6 prepares and validates deployment configuration only. No commit, push, Cloudflare project, custom domain, or deployment is authorized or performed.

## Verified repository settings

- Framework: Vite SPA
- Install command used by CI: `npm ci`
- Build command: `npm run build`
- Build output directory: `dist`
- Runtime: Node.js 24, pinned by `.nvmrc` and `package.json`
- SPA fallback: `public/_redirects` contains `/* /index.html 200` and Vite copies it to `dist/_redirects`

Run the release checks from a clean dependency install before deployment:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run db:validate
npm run build
npm run deployment:validate
npm run security:scan-build
```

The bundle scanner rejects private-key material, database URLs/password assignments, Supabase secret keys, and service-role JWTs. The Supabase project URL and browser publishable/anon key are intentionally public and will appear in browser assets when configured; RLS and RPC authorization must protect the data.

## GitHub Actions

`.github/workflows/ci.yml` runs on pushes to `main`, pull requests, and manual dispatch. It uses Node.js 24, installs exactly `package-lock.json` with `npm ci`, and runs every release check above. CI intentionally has no Supabase credentials because migration validation is static and live project access belongs in controlled manual release testing.

Do not configure GitHub repository secrets for a database password, service-role key, or admin password for this workflow.

## Cloudflare Pages account steps

After the owner separately authorizes commit and push:

1. In **Workers & Pages**, create a Pages application and connect the reviewed GitHub repository.
2. Select `main` as the production branch.
3. Choose the Vite preset, or enter `npm run build` as the build command and `dist` as the output directory.
4. Set `NODE_VERSION=24` for both Production and Preview. `.nvmrc` provides the same pin, but the dashboard value makes the account setting explicit.
5. Add only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the correct Production and Preview environments.
6. Save and deploy only after the CI run passes and deployment is explicitly authorized.
7. Record the generated `https://PROJECT.pages.dev` origin. Use that exact origin in Supabase URL configuration before testing Auth redirects.

Cloudflare creates preview deployments for non-production branches or pull requests. Confirm that the preview environment has its own variable values; do not assume Production values are copied automatically.

## Production and preview Supabase environments

Preferred isolation:

- **Production Pages** uses a dedicated production Supabase project.
- **Preview Pages** uses a separate preview/test Supabase project containing migrations and disposable test data.
- Local development uses `.env.local`, which remains ignored by Git.

Using the same Supabase project for Production and Preview is possible but not recommended: preview builds would share club data, anonymous users, and the admin allowlist with production. If temporary budget constraints require one project, document the shared-data risk, restrict preview access, and never test destructive flows against live club sessions.

For each Cloudflare environment, configure only:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_BROWSER_KEY
NODE_VERSION=24
```

Never add the database password, service-role/secret key, admin password, or private credential. All `VITE_` values are embedded into browser JavaScript.

## Supabase Auth URL configuration

In **Supabase Dashboard > Authentication > URL Configuration**:

1. Set **Site URL** to the exact canonical production origin, for example `https://PROJECT.pages.dev` or the final custom domain.
2. Add the exact production origin/path needed by Auth to **Redirect URLs**. Prefer exact production URLs rather than a broad wildcard.
3. Keep the required local development entry, such as `http://localhost:5173/**`, only for development.
4. If Auth callbacks must work on Cloudflare preview deployments, add the narrowest preview pattern that matches only this Pages project, then test it. Do not use a global `https://**` pattern.
5. After adding a custom domain, make it the Site URL, add its exact redirect entries, keep the `pages.dev` URL only if it remains an approved entry point, and retest sign-in/sign-out.

The current email/password sign-in does not supply a custom `redirectTo`, but Site URL is still the safe default for future confirmation, recovery, passwordless, or OAuth flows. Any future `redirectTo` value must match the configured allowlist.

## SPA route-refresh checks

The repository validates that the fallback rule reaches the built output. After an authorized Cloudflare deployment, manually open and hard-refresh each route:

- `/`
- `/admin/login`
- `/admin`
- an intentional unknown route such as `/not-a-route`

`/admin` must load the SPA instead of returning Cloudflare's 404 page; application authorization may then redirect an unauthenticated user. The unknown route must render the application's not-found page.

## Optional custom domain

Do not create a custom domain during readiness work. After deployment approval, add it from the Pages project's **Custom domains** section, follow Cloudflare's DNS instructions, wait for TLS to become active, update Supabase Site URL/Redirect URLs, and repeat all Auth and route-refresh checks. Preserve the generated `pages.dev` domain only if the club intentionally supports both origins.

## Manual release verification

Account access is required to complete these items:

- Confirm the Cloudflare production branch, build command, `dist` output, and Node.js 24 dashboard settings.
- Enter separate Production and Preview public Supabase variables.
- Confirm the first Cloudflare production and preview builds pass.
- Hard-refresh the deployed member, admin login, protected admin, and not-found routes.
- Set and verify Supabase Site URL and allowed redirect URLs against the deployed origins.
- Test anonymous member Auth, authorized admin Auth, Realtime reconnect, and protected RPC failures on the intended environment.
- Run the remaining two-authorized-admin and multi-court concurrency scenarios in `CONCURRENCY_REVIEW.md`.
- If approved, create and verify the optional custom domain and TLS.

Do not mark these account-dependent items complete based only on local repository checks.
