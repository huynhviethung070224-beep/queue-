# Supabase Setup

> Phase 1 status: Supabase is not connected. Do not perform these steps until Phase 2 migrations exist and Phase 2 is approved.

## Planned setup sequence

1. Create a new Supabase project in the club owner's organization and choose a strong database password stored in an approved password manager.
2. In Authentication settings, enable anonymous sign-ins for members.
3. Apply every file in `supabase/migrations` in filename order using the Supabase CLI or SQL editor. Phase 2 will provide the exact migration commands.
4. In Authentication > Users, create the first email/password admin user. Do not put the password in this repository.
5. Copy that user's Auth UUID and run the safe admin-link SQL statement documented by the Phase 2 migration. Do not hardcode the UUID in a migration.
6. Copy `.env.example` to `.env.local`, then add the project URL and public anon key.
7. Run `npm run dev` and open the printed local URL.
8. In the Table Editor or SQL editor, confirm RLS is enabled on every exposed application table.
9. Sign in anonymously and attempt an admin RPC. It must fail with an authorization error. Confirm a member cannot insert or update protected queue, match, court, game-count, or admin records directly.
10. If a free project is paused, use the Supabase dashboard restore option, wait for the project to become healthy, then reload the app. Realtime clients must reconnect and refetch current state.

## Allowed frontend environment variables

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

The anon key is intended for browser use together with correct RLS. A service-role key bypasses RLS and must never appear in frontend code, a `VITE_` variable, documentation examples, logs, or commits.

## Initial admin safety

The initial admin step will use a documented SQL insert equivalent to:

```sql
insert into public.admin_users (user_id)
values ('PASTE_AUTH_USER_UUID_HERE');
```

This example is not executable until Phase 2 defines the table and authorization model. Use an actual Auth UUID manually; never commit it.
