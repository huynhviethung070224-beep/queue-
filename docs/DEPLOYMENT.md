# Cloudflare Pages Deployment

> No production deployment is authorized or performed during Phase 1.

## Build settings

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Recommended Node version: 24

`public/_redirects` contains `/* /index.html 200`, so Cloudflare Pages serves the React SPA when `/admin` or another client route is refreshed directly.

## Planned GitHub connection

1. Push the reviewed repository to GitHub.
2. In Cloudflare Dashboard, open Workers & Pages and create a Pages project.
3. Connect the GitHub repository and select the production branch.
4. Enter the build command and output directory above.
5. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as production and preview environment variables. Do not add a service-role key.
6. Deploy and open the generated `pages.dev` URL.
7. Verify `/`, `/admin/login`, `/admin`, and an intentional unknown route.
8. Verify member and admin Supabase authentication against the production URL.

## Optional custom domain

Add the domain in the Pages project's Custom domains section, follow Cloudflare's DNS instructions, wait for TLS to become active, and then repeat the authentication and route-refresh checks.

## Supabase production settings

Before using production authentication, add the exact `pages.dev` URL and custom domain, if any, to Supabase's site URL and permitted redirect URLs. Confirm allowed origins and redirect behavior with the final Supabase client implementation. Do not guess or add wildcard production redirects unless the deployment design explicitly requires them.

## Production verification

- No real secret is present in the built JavaScript.
- Anonymous sign-in works on a new browser profile.
- Admin login redirects only to approved origins.
- Refreshing `/admin` does not return a Cloudflare 404.
- Realtime recovers after offline/online transitions.
- A member cannot invoke admin RPC functions.
