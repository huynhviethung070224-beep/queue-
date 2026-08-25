# Supabase Setup

Phase 6 retains the browser client, member/admin integration, Realtime publication migration, database migrations, and security/concurrency review. The current local checkout is linked to the owner's test project, but the repository contains no project reference, private credential, admin UUID, or password. These setup steps remain the reproducible procedure for a new preview or production project and require the club owner's Supabase access.

## 1. Create the project

1. Sign in to Supabase and create a project in the intended organization.
2. Choose the region closest to the club's normal users.
3. Generate a strong database password and store it in an approved password manager.
4. Wait until the database and API services show as healthy.

Never paste the database password into this repository.

## 2. Enable anonymous member sign-ins

In the Supabase dashboard, open **Authentication > Providers > Anonymous Sign-Ins**, enable anonymous sign-ins, and save.

An anonymous Supabase user is still assigned the PostgreSQL `authenticated` role. The migrations therefore grant sanitized reads and approved RPC execution to `authenticated`, not to the unauthenticated `anon` role.

Before public launch, configure Supabase's recommended CAPTCHA/rate-limit protections for anonymous sign-ins.

## 3. Apply migrations

Migrations are append-only and must run in filename order:

1. `20260824100000_initial_schema.sql`
2. `20260824101000_rls_and_privileges.sql`
3. `20260824102000_state_transition_functions.sql`
4. `20260824103000_enable_member_realtime.sql`
5. `20260825150000_grant_rls_helper_execution.sql`
6. `20260825153000_fix_join_queue_conflict_target.sql`

### Recommended CLI method

Install or invoke the current Supabase CLI, then authenticate and link this checkout:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Review the project reference before confirming. `db push` must target the new project, not an unrelated database.

After the migrations apply, regenerate the checked-in database types from that linked schema and review the diff:

```bash
npx supabase gen types typescript --linked > src/types/database.ts
npm run typecheck
```

The checked-in type file currently mirrors the migration schema. Regeneration becomes the authoritative check after a real project exists.

### Dashboard alternative

Open **SQL Editor**, paste one complete migration at a time, and run it. Do not combine files or reorder statements. Stop immediately if a migration fails; do not edit an already-applied migration to hide the failure. Diagnose the cause and add a new corrective migration when needed.

## 4. Verify schema, courts, and RLS

Run this read-only audit in SQL Editor:

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_catalog.pg_class as c
join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'players',
    'player_identities',
    'admin_users',
    'club_sessions',
    'session_players',
    'queue_entries',
    'courts',
    'matches',
    'match_players'
  )
order by c.relname;
```

All nine rows must report `rls_enabled = true`.

Confirm the fixed courts:

```sql
select number, name, status
from public.courts
order by number;
```

The result must contain exactly Court 1, Court 2, and Court 3.

## 5. Create and link the first admin

1. Open **Authentication > Users**.
2. Create an email/password user using the real admin's email and a strong temporary password.
3. Copy that user's Auth UUID.
4. In SQL Editor, replace the placeholder below and run the statement once:

```sql
insert into public.admin_users (user_id)
values ('PASTE_AUTH_USER_UUID_HERE'::uuid)
on conflict (user_id) do nothing;
```

Do not commit the admin email, password, or UUID. Additional admins use the same process with their own Auth users.

Verify the link without displaying other Auth records:

```sql
select exists (
  select 1
  from public.admin_users
  where user_id = 'PASTE_AUTH_USER_UUID_HERE'::uuid
) as admin_linked;
```

## 6. Configure local public values

Create a local environment file:

```bash
cp .env.example .env.local
```

In **Project Settings > API**, copy the project URL and public anon/publishable value into:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_BROWSER_KEY
```

The environment variable remains named `VITE_SUPABASE_ANON_KEY` to match the approved project specification. Never use the service-role key in a browser variable. Any variable prefixed with `VITE_` is included in client-side build output.

Run the repository checks:

```bash
npm run db:validate
npm run lint
npm run typecheck
npm run test
npm run build
```

Both member and admin routes use the configured project immediately. The admin account must be an email/password Auth user whose UUID is also present in `admin_users`.

Confirm that the seven member-visible live tables were added to the Realtime publication:

```sql
select schemaname, tablename
from pg_catalog.pg_publication_tables
where pubname = 'supabase_realtime'
order by schemaname, tablename;
```

The result must include `club_sessions`, `players`, `session_players`, `queue_entries`, `courts`, `matches`, and `match_players`. It must not include `player_identities` or `admin_users` because those tables contain authorization-sensitive mappings.

## 7. Verify function security

Audit security-definer configuration:

```sql
select
  n.nspname as schema_name,
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.proconfig as function_settings
from pg_catalog.pg_proc as p
join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
  and p.prosecdef
order by n.nspname, p.proname;
```

Every returned function must include an empty `search_path` setting.

Confirm application roles have no direct writes:

```sql
select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER')
order by grantee, table_name, privilege_type;
```

The query must return zero rows for the application tables.

After the member route creates an anonymous session, verify that anonymous member credentials can call `join_current_queue` and `leave_current_queue` but receive `Admin authorization is required` from admin RPCs. Also verify direct inserts or updates fail with permission errors.

## 8. Paused free project recovery

If a free Supabase project pauses:

1. Open the project dashboard and choose **Restore project**.
2. Wait until Database, Auth, API, and Realtime are healthy.
3. Do not reapply successful migrations.
4. Run the read-only schema/RLS audits above.
5. Restart the local app if environment values changed.
6. Confirm that reconnecting member and admin clients refetch authoritative state rather than relying on missed Realtime events.

## Secrets checklist

- `.env.local` is ignored by Git.
- Only the URL and public browser key use the `VITE_` prefix.
- No service-role key is stored, logged, or sent to the browser.
- Admin credentials and Auth UUIDs stay out of commits and screenshots.
- Migrations contain schema and policies only, never project-specific secrets.
