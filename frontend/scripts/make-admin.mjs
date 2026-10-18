#!/usr/bin/env node
/**
 * Make an existing account an admin — how the first admin is created, since
 * /admin itself is admin-only.
 *
 *   pnpm --filter frontend make-admin -- you@example.com
 *
 * Creates the Firebase Auth account if there isn't one (no password — set it
 * with "Forgot password?" on the sign-in page), and the users/{uid} profile if
 * that is missing. A deactivated profile is reactivated.
 *
 * Reads credentials from frontend/.env.local (run `pnpm run env:sync` first).
 */

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

function exit(message) {
  console.error(message)
  process.exit(1)
}

const email = process.argv.slice(2).find((arg) => arg !== '--')
if (!email || !email.includes('@')) exit('Usage: pnpm --filter frontend make-admin -- <email>')

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

let account
let created = false
try {
  account = await auth.getUserByEmail(email)
} catch (error) {
  if (error?.code !== 'auth/user-not-found') throw error
  // Verified because the only way in is the reset link emailed to this address.
  account = await auth.createUser({ email, emailVerified: true })
  created = true
}

const ref = db.collection('users').doc(account.uid)
const snap = await ref.get()

if (snap.exists) {
  await ref.update({ role: 'admin', deletedAt: null, updatedAt: FieldValue.serverTimestamp() })
} else {
  await ref.set({
    uid: account.uid,
    email: account.email ?? email,
    displayName: account.displayName ?? null,
    photoURL: account.photoURL ?? null,
    role: 'admin',
    deletedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    _schemaVersion: 1,
  })
}
if (account.disabled) await auth.updateUser(account.uid, { disabled: false })

console.log(
  created
    ? `Created ${email} as an admin. Use "Forgot password?" on the sign-in page to set a password.`
    : `${email} is now an admin. Sign out and back in to see the Admin link.`
)
