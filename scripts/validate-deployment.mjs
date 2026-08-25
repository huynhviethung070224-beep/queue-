import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
const publicRedirects = readFileSync(resolve('public/_redirects'), 'utf8').trim()
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
assert.equal(
  publicRedirects,
  '/* /index.html 200',
  'Cloudflare Pages needs the SPA fallback in public/_redirects.',
)

for (const command of [
  'npm ci',
  'npm run lint',
  'npm run typecheck',
  'npm run test',
  'npm run db:validate',
  'npm run build',
  'npm run deployment:validate',
  'npm run security:scan-build',
]) {
  assert.ok(ciWorkflow.includes(command), `CI is missing: ${command}`)
}
assert.match(ciWorkflow, /node-version:\s*24/, 'CI must use Node.js 24.')

for (const artifact of ['dist/index.html', 'dist/_redirects', 'dist/assets']) {
  assert.ok(existsSync(resolve(artifact)), `Missing production artifact: ${artifact}`)
}

assert.equal(
  readFileSync(resolve('dist/_redirects'), 'utf8').trim(),
  publicRedirects,
  'Vite must copy the SPA fallback into dist unchanged.',
)

const assetFiles = readdirSync(resolve('dist/assets'))
assert.ok(assetFiles.some((file) => file.endsWith('.js')), 'dist has no JavaScript bundle.')
assert.ok(assetFiles.some((file) => file.endsWith('.css')), 'dist has no CSS bundle.')

console.log(
  'Validated Node.js 24, CI commands, Cloudflare SPA fallback, and dist artifacts.',
)
