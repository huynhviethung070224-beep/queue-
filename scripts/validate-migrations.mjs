import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationDirectory = resolve('supabase/migrations')
const expectedFiles = [
  '20260824100000_initial_schema.sql',
  '20260824101000_rls_and_privileges.sql',
  '20260824102000_state_transition_functions.sql',
  '20260824103000_enable_member_realtime.sql',
  '20260825150000_grant_rls_helper_execution.sql',
  '20260825153000_fix_join_queue_conflict_target.sql',
]
const migrationFiles = readdirSync(migrationDirectory)
  .filter((fileName) => fileName.endsWith('.sql'))
  .sort()

assert.deepEqual(
  migrationFiles.slice(0, expectedFiles.length),
  expectedFiles,
  'Phase 2 migration files must remain the ordered, append-only prefix.',
)

const migrations = Object.fromEntries(
  migrationFiles.map((fileName) => [
    fileName,
    readFileSync(resolve(migrationDirectory, fileName), 'utf8'),
  ]),
)
const combinedSql = Object.values(migrations).join('\n')

const requiredTables = [
  'players',
  'member_payment_statuses',
  'profile_link_requests',
  'player_identities',
  'admin_users',
  'club_sessions',
  'session_players',
  'queue_entries',
  'courts',
  'matches',
  'match_players',
]

for (const tableName of requiredTables) {
  assert.match(
    combinedSql,
    new RegExp(`create table public\\.${tableName}\\s*\\(`, 'i'),
    `Missing table: ${tableName}`,
  )
  assert.match(
    combinedSql,
    new RegExp(`alter table public\\.${tableName} enable row level security;`, 'i'),
    `RLS must be enabled on ${tableName}.`,
  )
}

const requiredRpcFunctions = [
  'join_current_queue',
  'leave_current_queue',
  'create_club_session',
  'open_club_session',
  'close_club_session',
  'assign_players_to_court',
  'start_called_match',
  'cancel_called_match',
  'end_playing_match',
  'admin_remove_player',
  'admin_update_player',
  'set_court_enabled',
  'set_member_payment_status',
  'set_session_match_duration',
  'admin_delete_member',
]

for (const functionName of requiredRpcFunctions) {
  assert.match(
    combinedSql,
    new RegExp(`create function public\\.${functionName}\\s*\\(`, 'i'),
    `Missing RPC function: ${functionName}`,
  )
  assert.match(
    combinedSql,
    new RegExp(`grant execute on function public\\.${functionName}\\(`, 'i'),
    `Authenticated execution grant missing for ${functionName}.`,
  )
}

const functionBlocks = combinedSql.match(/create function[\s\S]*?\n\$\$;/gi) ?? []
const securityDefinerBlocks = functionBlocks.filter((block) =>
  /security definer/i.test(block),
)

assert.ok(securityDefinerBlocks.length > 0, 'Expected security-definer functions.')

for (const functionBlock of securityDefinerBlocks) {
  const functionName = functionBlock.match(/create function\s+([^\s(]+)/i)?.[1]
  assert.match(
    functionBlock,
    /set search_path = ''/i,
    `${functionName ?? 'Unknown function'} must set an empty search_path.`,
  )
}

function publicFunctionBlock(functionName) {
  const block = combinedSql.match(
    new RegExp(
      `create function public\\.${functionName}\\s*\\([\\s\\S]*?\\n\\$\\$;`,
      'i',
    ),
  )?.[0]
  assert.ok(block, `Missing function body for ${functionName}.`)
  return block
}

const adminFunctions = [
  'create_club_session',
  'open_club_session',
  'close_club_session',
  'assign_players_to_court',
  'start_called_match',
  'cancel_called_match',
  'end_playing_match',
  'admin_remove_player',
  'admin_update_player',
  'set_court_enabled',
  'set_member_payment_status',
  'set_session_match_duration',
  'admin_delete_member',
]

for (const functionName of adminFunctions) {
  assert.match(
    publicFunctionBlock(functionName),
    /(?:perform private\.require_admin\(\);|[a-z_]+\s*=\s*private\.require_admin\(\);)/i,
    `${functionName} must recheck database admin membership.`,
  )
}

for (const functionName of [
  'join_current_queue',
  'leave_current_queue',
  'search_member_profiles',
]) {
  assert.match(
    publicFunctionBlock(functionName),
    /private\.require_authenticated\(\)/i,
    `${functionName} must require an authenticated caller.`,
  )
}

assert.match(
  combinedSql,
  /create function public\.admin_delete_member\([\s\S]*?perform private\.require_admin\(\);/i,
  'Member deletion must be an admin-authorized security-definer RPC.',
)

for (const functionName of ['search_member_profiles', 'list_members_for_admin']) {
  assert.match(
    combinedSql,
    new RegExp(`grant execute on function public\\.${functionName}\\(`, 'i'),
    `Authenticated execution grant missing for ${functionName}.`,
  )
}

for (const functionName of [
  'request_profile_link',
  'get_my_profile_link_request',
  'list_profile_link_requests',
  'review_profile_link_request',
]) {
  assert.match(
    combinedSql,
    new RegExp(`grant execute on function public\\.${functionName}\\(`, 'i'),
    `Authenticated execution grant missing for ${functionName}.`,
  )
}

assert.match(
  publicFunctionBlock('request_profile_link'),
  /private\.require_authenticated\(\)/i,
  'Profile-link requests must require an authenticated caller.',
)
for (const functionName of ['list_profile_link_requests', 'review_profile_link_request']) {
  assert.match(
    publicFunctionBlock(functionName),
    /(?:perform private\.require_admin\(\);|[a-z_]+\s*=\s*private\.require_admin\(\);)/i,
    `${functionName} must recheck database admin membership.`,
  )
}

const assignBlock = publicFunctionBlock('assign_players_to_court')
assert.ok(
  (assignBlock.match(/for update;/gi) ?? []).length >= 3,
  'Assignment must lock the active session, court, and selected queue rows.',
)
assert.match(
  combinedSql,
  /create unique index matches_one_active_per_court_idx[\s\S]*?where status in \('called', 'playing'\);/i,
  'Active matches must remain unique per court.',
)
assert.match(
  combinedSql,
  /create unique index match_players_one_active_match_per_player_idx[\s\S]*?where released_at is null;/i,
  'A player must remain unique across active matches.',
)
assert.match(
  combinedSql,
  /create unique index queue_entries_one_active_per_player_idx[\s\S]*?where status in \('waiting', 'called', 'playing'\);/i,
  'A player must remain unique in the active session queue.',
)

assert.doesNotMatch(
  combinedSql,
  /grant select on table public\.admin_users to (?:anon|authenticated)/i,
  'Client roles must not receive direct admin membership reads.',
)

assert.match(
  combinedSql,
  /create trigger matches_copy_session_duration[\s\S]*?before insert on public\.matches/i,
  'Each new match must copy the session duration exactly once at insert time.',
)
assert.match(
  combinedSql,
  /default_match_duration_seconds integer not null default 420/i,
  'New sessions must default to a seven-minute match duration.',
)
assert.match(
  publicFunctionBlock('set_member_payment_status'),
  /perform private\.require_admin\(\);/i,
  'Only an authorized admin may change payment status.',
)
assert.match(
  combinedSql,
  /create table public\.member_payment_statuses\s*\([\s\S]*?player_id uuid primary key references public\.players/i,
  'Payment status must persist by stable player ID rather than by club session.',
)
assert.doesNotMatch(
  publicFunctionBlock('search_member_profiles'),
  /\b(?:insert|update|delete)\b/i,
  'Profile search must remain discovery-only and must never link or mutate identities.',
)

assert.match(
  combinedSql,
  /grant usage on schema private to authenticated;/i,
  'Authenticated RLS evaluation requires usage on the private helper schema.',
)
for (const functionName of ['is_admin', 'current_player_id']) {
  assert.match(
    combinedSql,
    new RegExp(
      `grant execute on function private\\.${functionName}\\(\\) to authenticated;`,
      'i',
    ),
    `Authenticated RLS evaluation requires execute on private.${functionName}().`,
  )
}
for (const functionName of ['require_authenticated', 'require_admin']) {
  assert.doesNotMatch(
    combinedSql,
    new RegExp(
      `grant execute on function private\\.${functionName}\\(\\) to authenticated;`,
      'i',
    ),
    `private.${functionName}() must remain callable only inside security-definer functions.`,
  )
}

assert.match(
  migrations['20260824100000_initial_schema.sql'],
  /\(1, 'Court 1', 'available'\),\s*\(2, 'Court 2', 'available'\),\s*\(3, 'Court 3', 'available'\)/,
  'The migration must seed exactly the three configured courts.',
)

assert.doesNotMatch(
  combinedSql,
  /grant\s+(?:all|insert|update|delete)[\s\S]*?to\s+(?:anon|authenticated)/i,
  'Client roles must not receive direct write privileges on application tables.',
)

const realtimeMigration = migrations['20260824103000_enable_member_realtime.sql']
const realtimeTables = [
  'club_sessions',
  'players',
  'session_players',
  'queue_entries',
  'courts',
  'matches',
  'match_players',
]

for (const tableName of realtimeTables) {
  assert.match(
    realtimeMigration,
    new RegExp(`'${tableName}'`, 'i'),
    `Realtime publication is missing ${tableName}.`,
  )
}

assert.doesNotMatch(
  realtimeMigration,
  /'player_identities'|'admin_users'|'member_payment_statuses'/i,
  'Sensitive identity, admin, and payment tables must not be published to Realtime.',
)

assert.match(
  migrations['20260825153000_fix_join_queue_conflict_target.sql'],
  /create or replace function public\.join_current_queue[\s\S]*?on conflict on constraint session_players_pkey/i,
  'The live-tested join RPC must use an unambiguous session-player conflict target.',
)

const latestJoinFix = migrations['20260922100000_fix_join_queue_returning_ambiguity.sql']
assert.ok(latestJoinFix, 'The append-only join ambiguity fix migration must exist.')
assert.match(
  latestJoinFix,
  /returns table \(queue_entry_id uuid, player_id uuid, session_id uuid, status public\.queue_status\)/i,
  'The join RPC return type must remain compatible with the generated frontend type.',
)
assert.match(
  latestJoinFix,
  /returning queue_entries\.id, queue_entries\.status into current_queue_entry_id, current_queue_status/i,
  'The join RPC must qualify INSERT RETURNING columns that conflict with output parameters.',
)
assert.match(
  latestJoinFix,
  /pg_advisory_xact_lock\(pg_catalog\.hashtextextended\(caller_id::text, 0\)\)/i,
  'The join RPC must serialize concurrent requests from the same authenticated member.',
)
assert.doesNotMatch(
  latestJoinFix,
  /returning id, status into/i,
  'The join RPC must never reintroduce ambiguous unqualified RETURNING columns.',
)

const memberAdminGrantFix = migrations['20260922110000_harden_member_admin_rpc_grants.sql']
assert.ok(memberAdminGrantFix, 'The append-only member admin RPC grant fix must exist.')
assert.match(
  memberAdminGrantFix,
  /revoke execute on function public\.list_members_for_admin\(text\) from public, anon, authenticated/i,
  'The member directory RPC must not retain PostgreSQL default PUBLIC execute access.',
)
assert.match(
  memberAdminGrantFix,
  /grant execute on function public\.list_members_for_admin\(text\) to authenticated/i,
  'Signed-in callers must retain access so the RPC can perform its database admin check.',
)

const deviceLinkFix = migrations['20260923090000_idempotent_device_profile_link.sql']
assert.ok(deviceLinkFix, 'The append-only idempotent device-link migration must exist.')
assert.match(
  deviceLinkFix,
  /if linked_player_id = target_id then\s+return target_id;/i,
  'Requesting the profile already linked to this browser must be idempotent.',
)
assert.match(
  deviceLinkFix,
  /if linked_player_id is not null then\s+raise exception 'This browser is already linked to a different approved profile\./i,
  'A browser linked to another member must not be silently reassigned.',
)
assert.match(
  deviceLinkFix,
  /pg_advisory_xact_lock\(pg_catalog\.hashtextextended\(caller::text, 0\)\)/i,
  'Concurrent link requests from one browser identity must be serialized.',
)

const singleDeviceFix = migrations['20260923093000_single_device_profile_ownership.sql']
assert.ok(singleDeviceFix, 'The append-only single-device ownership migration must exist.')
assert.match(
  singleDeviceFix,
  /create unique index player_identities_one_device_per_player_idx\s+on public\.player_identities \(player_id\)/i,
  'Each profile must have at most one approved browser identity.',
)
assert.match(
  singleDeviceFix,
  /delete from public\.player_identities[\s\S]*?auth_user_id <> request_row\.auth_user_id/i,
  'Approving a new browser must revoke the previous browser link atomically.',
)
assert.match(
  singleDeviceFix,
  /queue_entries\.status in \('waiting', 'called', 'playing'\)[\s\S]*?Transfer access after the member leaves/i,
  'An active queue or match profile must not transfer to another browser.',
)
assert.match(
  singleDeviceFix,
  /requesting_player_id is distinct from target_id[\s\S]*?requesting browser no longer controls this profile/i,
  'A revoked browser must not retain authority to change member skill.',
)

assert.doesNotMatch(
  combinedSql,
  /service[_-]?role\s*(?:key|=)/i,
  'Migrations must never contain a service-role credential.',
)

console.log(
  `Validated ${migrationFiles.length} migrations, ${requiredTables.length} RLS tables, and ${requiredRpcFunctions.length} state-change RPCs.`,
)
