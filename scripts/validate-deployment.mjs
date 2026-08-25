import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
const workerConfig = JSON.parse(readFileSync(resolve('wrangler.jsonc'), 'utf8'))
const ciWorkflow = readFileSync(resolve('.github/workflows/ci.yml'), 'utf8')

assert.equal(
  packageJson.engines?.node,
  '>=24 <25',
  'package.json must keep the build on Node.js 24.',
)
assert.equal(
  readFileSync(resolve('.nvmrc'), 'utf8').trim(),
  '24',
  '.nvmrc must select Node.js 24 for local and Cloudflare builds.',
)
assert.equal(workerConfig.name, 'queue', 'Wrangler must target the existing queue Worker.')
assert.equal(
  workerConfig.assets?.directory,
  './dist',
  'Wrangler must upload the Vite dist directory.',
)
assert.equal(
  workerConfig.assets?.not_found_handling,
  'single-page-application',
  'Cloudflare Workers must serve index.html for unmatched SPA navigation routes.',
)

for (const command of [
  'npm ci',
  'npm run lint',
  'npm run typecheck',
  'npm run test',
  'npm run db:validate',
  'npm run build',
  'npm run worker:dry-run',
  'npm run deployment:validate',
  'npm run security:scan-build',
]) {
  assert.ok(ciWorkflow.includes(command), `CI is missing: ${command}`)
}
assert.match(ciWorkflow, /node-version:\s*24/, 'CI must use Node.js 24.')

for (const artifact of ['dist/index.html', 'dist/assets']) {
  assert.ok(existsSync(resolve(artifact)), `Missing production artifact: ${artifact}`)
}

assert.ok(
  !existsSync(resolve('dist/_redirects')),
  'Workers SPA routing must use wrangler.jsonc, not a Pages-style _redirects rewrite.',
)

const assetFiles = readdirSync(resolve('dist/assets'))
assert.ok(assetFiles.some((file) => file.endsWith('.js')), 'dist has no JavaScript bundle.')
assert.ok(assetFiles.some((file) => file.endsWith('.css')), 'dist has no CSS bundle.')

console.log(
  'Validated Node.js 24, CI commands, Workers SPA routing, and dist artifacts.',
)
