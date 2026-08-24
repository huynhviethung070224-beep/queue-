import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationDirectory = resolve('supabase/migrations')
const expectedFiles = [
  '20260824100000_initial_schema.sql',
  '20260824101000_rls_and_privileges.sql',
  '20260824102000_state_transition_functions.sql',
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

assert.doesNotMatch(
  combinedSql,
  /service[_-]?role\s*(?:key|=)/i,
  'Migrations must never contain a service-role credential.',
)

console.log(
  `Validated ${migrationFiles.length} migrations, ${requiredTables.length} RLS tables, and ${requiredRpcFunctions.length} state-change RPCs.`,
)
