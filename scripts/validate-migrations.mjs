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
]

for (const functionName of adminFunctions) {
  assert.match(
    publicFunctionBlock(functionName),
    /perform private\.require_admin\(\);/i,
    `${functionName} must recheck database admin membership.`,
  )
}

for (const functionName of ['join_current_queue', 'leave_current_queue']) {
  assert.match(
    publicFunctionBlock(functionName),
    /private\.require_authenticated\(\)/i,
    `${functionName} must require an authenticated caller.`,
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
  /'player_identities'|'admin_users'/i,
  'Sensitive identity and admin tables must not be published to Realtime.',
)

assert.match(
  migrations['20260825153000_fix_join_queue_conflict_target.sql'],
  /create or replace function public\.join_current_queue[\s\S]*?on conflict on constraint session_players_pkey/i,
  'The live-tested join RPC must use an unambiguous session-player conflict target.',
)

assert.doesNotMatch(
  combinedSql,
  /service[_-]?role\s*(?:key|=)/i,
  'Migrations must never contain a service-role credential.',
)

console.log(
  `Validated ${migrationFiles.length} migrations, ${requiredTables.length} RLS tables, and ${requiredRpcFunctions.length} state-change RPCs.`,
)
