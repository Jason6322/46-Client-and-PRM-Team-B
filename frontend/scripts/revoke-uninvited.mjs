#!/usr/bin/env node
/**
 * Sign out every account that has no active users/{uid} profile — run once
 * when rolling out invite-only access.
 *
 *   pnpm --filter frontend revoke-uninvited             # dry run: list them
 *   pnpm --filter frontend revoke-uninvited -- --write  # revoke their sessions
 *
 * Session cookies last 14 days and the server doesn't re-check the profile on
 * every request (that would cost a read per page). So anyone who got a cookie
 * before access became invite-only, or who was removed without being
 * deactivated first, could keep using the app until it expired. Revoking their
 * refresh tokens makes those cookies fail verification straight away. Their
 * Auth accounts are left alone: an admin can still give them access at /admin.
 *
 * Reads credentials from frontend/.env.local (run `pnpm run env:sync` first).
 */

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function exit(message) {
  console.error(message)
  process.exit(1)
}

const write = process.argv.includes('--write')

const envFile = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local')
if (!existsSync(envFile)) exit('frontend/.env.local not found — run `pnpm run env:sync` first.')
process.loadEnvFile(envFile)

const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64
if (!key) exit('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 is not set in frontend/.env.local.')

const app = initializeApp({
  credential: cert(JSON.parse(Buffer.from(key, 'base64').toString('utf8'))),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
})
const auth = getAuth(app)
const db = getFirestore(app)

const profiles = await db.collection('users').get()
const active = new Set(profiles.docs.filter((doc) => doc.get('deletedAt') == null).map((doc) => doc.id))

const uninvited = []
let pageToken
do {
  const page = await auth.listUsers(1000, pageToken)
  uninvited.push(...page.users.filter((account) => !active.has(account.uid)))
  pageToken = page.pageToken
} while (pageToken)

if (uninvited.length === 0) {
  console.log('Every account has an active profile — nothing to revoke.')
  process.exit(0)
}

for (const account of uninvited) {
  if (write) await auth.revokeRefreshTokens(account.uid)
  console.log(`${write ? 'Revoked' : 'Would revoke'}: ${account.email ?? account.uid}`)
}

console.log(
  write
    ? `Signed out ${uninvited.length} account(s) without access.`
    : `${uninvited.length} account(s) without access. Run again with --write to sign them out.`
)
