import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, resolve } from 'node:path'

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map', '.svg', '.txt'])
const files = []

function collectFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      collectFiles(fullPath)
    } else if (entry.isFile() && textExtensions.has(extname(entry.name))) {
      files.push(fullPath)
    }
  }
}

const distDirectory = resolve('dist')
assert.ok(statSync(distDirectory).isDirectory(), 'Run npm run build before scanning dist.')
collectFiles(distDirectory)

const forbiddenPatterns = [
  { label: 'Supabase secret key', pattern: /sb_secret_[A-Za-z0-9._-]{12,}/g },
  { label: 'PostgreSQL connection URL', pattern: /postgres(?:ql)?:\/\/[^\s"'`]+/gi },
  { label: 'private key material', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  {
    label: 'private environment assignment',
    pattern: /(?:SUPABASE_DB_PASSWORD|DATABASE_URL|SERVICE_ROLE_KEY)\s*=/gi,
  },
]

function isServiceRoleJwt(candidate) {
  try {
    const [, payload] = candidate.split('.')
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return decoded?.role === 'service_role'
  } catch {
    return false
  }
}

const findings = []
for (const file of files) {
  const content = readFileSync(file, 'utf8')
  for (const { label, pattern } of forbiddenPatterns) {
    pattern.lastIndex = 0
    if (pattern.test(content)) findings.push(`${label} in ${file}`)
  }

  const jwtCandidates = content.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []
  if (jwtCandidates.some(isServiceRoleJwt)) {
    findings.push(`service-role JWT in ${file}`)
  }
}

assert.deepEqual(
  findings,
  [],
  `Private credential-like material found in the production bundle:\n${findings.join('\n')}`,
)

console.log(`Scanned ${files.length} production files; no private credentials detected.`)
