'use server'

import { randomBytes } from 'node:crypto'
import { FieldValue, type Timestamp } from 'firebase-admin/firestore'
import type { UserRecord } from 'firebase-admin/auth'
import { revalidatePath } from 'next/cache'
import { CACHE_TAGS, invalidate } from '@/lib/cache'
import { z } from 'zod'
import { requireAdmin } from '@/actions/auth.actions'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { inviteUserSchema, type InviteUserInput } from '@/lib/validations/auth'
import { idSchema } from '@/lib/validations/common'
import type { ActionResult } from '@/types'
import type { UserRole } from '@/types/firestore'

/**
 * User management for /admin. Sign-up is invite-only: a person can use the CRM
 * only once a users/{uid} profile exists, and only these actions (Admin SDK)
 * create one — the security rules deny client-side creation, and the session
 * route refuses a cookie to anyone without an active profile.
 */

export type AdminUserStatus = 'active' | 'deactivated' | 'no-access'

export interface AdminUser {
  uid: string
  email: string
  displayName: string | null
  role: UserRole | null
  /** 'no-access': has a Firebase account (e.g. from the old open sign-up) but was never added. */
  status: AdminUserStatus
  lastSignInAt: number | null
}

const roleSchema = z.enum(['user', 'admin'])

function profileFrom(
  record: Pick<UserRecord, 'uid' | 'email' | 'displayName' | 'photoURL'>,
  role: UserRole
) {
  return {
    uid: record.uid,
    email: record.email ?? '',
    displayName: record.displayName ?? null,
    photoURL: record.photoURL ?? null,
    role,
    deletedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    _schemaVersion: 1,
  }
}

function isUserNotFound(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'auth/user-not-found'
  )
}

/**
 * Before giving an existing account access, make sure only the owner of its
 * inbox can use it. Anyone can create an unverified account for someone else's
 * address through the public API; replacing the password and revoking its
 * sessions locks that person out, and the setup email lets the real owner in.
 *
 * Also re-enables the account: one that was deactivated and then removed is
 * still disabled in Firebase Auth, and couldn't sign in even with a profile.
 */
async function prepareForAccess(account: UserRecord) {
  if (account.disabled) {
    await adminAuth.updateUser(account.uid, { disabled: false })
  }
  if (account.emailVerified) return
  await adminAuth.updateUser(account.uid, {
    password: randomBytes(32).toString('base64url'),
    emailVerified: true,
  })
  await adminAuth.revokeRefreshTokens(account.uid)
}

function lastSignIn(record: UserRecord | undefined) {
  const value = record?.metadata.lastSignInTime
  return value ? new Date(value).getTime() : null
}

/** Every Firebase Auth account — listUsers returns at most 1,000 per page. */
async function allAccounts() {
  const accounts: UserRecord[] = []
  let pageToken: string | undefined
  do {
    const page = await adminAuth.listUsers(1000, pageToken)
    accounts.push(...page.users)
    pageToken = page.pageToken
  } while (pageToken)
  return accounts
}

export async function listUsers(): Promise<ActionResult<AdminUser[]>> {
  await requireAdmin()

  try {
    const [profiles, accounts] = await Promise.all([
      adminDb.collection('users').get(),
      allAccounts(),
    ])
    const accountsByUid = new Map(accounts.map((record) => [record.uid, record]))

    const users: AdminUser[] = profiles.docs.map((doc) => {
      const account = accountsByUid.get(doc.id)
      accountsByUid.delete(doc.id)
      const deletedAt = doc.get('deletedAt') as Timestamp | null | undefined
      return {
        uid: doc.id,
        // Auth's address, not the profile's: users can edit their own profile.
        email: account?.email ?? (doc.get('email') as string | undefined) ?? '',
        displayName: (doc.get('displayName') as string | null | undefined) ?? null,
        role: doc.get('role') === 'admin' ? 'admin' : 'user',
        status: deletedAt != null || account?.disabled ? 'deactivated' : 'active',
        lastSignInAt: lastSignIn(account),
      }
    })

    // Accounts Firebase Auth knows about but no admin ever added.
    for (const account of accountsByUid.values()) {
      users.push({
        uid: account.uid,
        email: account.email ?? '',
        displayName: account.displayName ?? null,
        role: null,
        status: 'no-access',
        lastSignInAt: lastSignIn(account),
      })
    }

    const order: Record<AdminUserStatus, number> = { active: 0, 'no-access': 1, deactivated: 2 }
    users.sort(
      (a, b) =>
        order[a.status] - order[b.status] ||
        (a.displayName ?? a.email).localeCompare(b.displayName ?? b.email)
    )
    return { success: true, data: users }
  } catch {
    return { success: false, error: 'Failed to load users' }
  }
}

/**
 * Add someone to the CRM. Creates their Firebase Auth account (no password) if
 * they don't have one; the caller then sends them a password-setup email.
 */
export async function inviteUser(input: InviteUserInput): Promise<ActionResult<{ email: string }>> {
  await requireAdmin()

  const parsed = inviteUserSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }
  const { email, displayName, role } = parsed.data

  try {
    let account: UserRecord
    try {
      account = await adminAuth.getUserByEmail(email)
    } catch (error: unknown) {
      if (!isUserNotFound(error)) throw error
      // Marked verified because the person can only get in through the setup
      // link emailed to this address.
      account = await adminAuth.createUser({ email, displayName, emailVerified: true })
    }

    const profileRef = adminDb.collection('users').doc(account.uid)
    const existing = await profileRef.get()
    if (existing.exists) {
      return {
        success: false,
        error:
          existing.get('deletedAt') == null
            ? 'That person already has access'
            : 'That person was deactivated — reactivate them from the list instead',
      }
    }

    await prepareForAccess(account)
    if (!account.displayName) {
      await adminAuth.updateUser(account.uid, { displayName })
    }
    await profileRef.set(
      profileFrom(
        { uid: account.uid, email: account.email, displayName, photoURL: account.photoURL },
        role
      )
    )

    invalidate(CACHE_TAGS.users)
    revalidatePath('/admin')
    return { success: true, data: { email } }
  } catch {
    return { success: false, error: 'Failed to add user' }
  }
}

/** Give a "no access" account (signed in but never added) a profile. */
export async function grantAccess(uid: string): Promise<ActionResult> {
  await requireAdmin()

  const parsed = idSchema.safeParse(uid)
  if (!parsed.success) return { success: false, error: 'Invalid user' }

  try {
    const account = await adminAuth.getUser(parsed.data)
    const profileRef = adminDb.collection('users').doc(account.uid)
    if ((await profileRef.get()).exists) {
      return { success: false, error: 'That person already has a profile' }
    }
    await prepareForAccess(account)
    await profileRef.set(profileFrom(account, 'user'))
    invalidate(CACHE_TAGS.users)
    revalidatePath('/admin')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to give access' }
  }
}

/**
 * Deactivate or reactivate an account. Deactivating disables it in Firebase
 * Auth and revokes its sessions, so the person is signed out everywhere.
 */
export async function setUserActive(uid: string, active: boolean): Promise<ActionResult> {
  const session = await requireAdmin()

  const parsed = idSchema.safeParse(uid)
  if (!parsed.success) return { success: false, error: 'Invalid user' }
  if (parsed.data === session.uid) {
    return { success: false, error: "You can't deactivate your own account" }
  }

  try {
    await adminAuth.updateUser(parsed.data, { disabled: !active })
    if (!active) await adminAuth.revokeRefreshTokens(parsed.data)
    await adminDb
      .collection('users')
      .doc(parsed.data)
      .update({
        deletedAt: active ? null : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    invalidate(CACHE_TAGS.users)
    revalidatePath('/admin')
    return { success: true }
  } catch {
    return {
      success: false,
      error: active ? 'Failed to reactivate user' : 'Failed to deactivate user',
    }
  }
}

/**
 * Undo an invite — for when an admin added the wrong address. Unlike
 * deactivating, this is a hard delete, so the address can be added again and
 * the mistake doesn't linger in the list.
 *
 * If the account has never signed in, it existed only because of the invite,
 * so the Auth account goes too and the setup link already emailed stops
 * working. If it has, only the profile is removed (the person drops to "No
 * access") and its sessions are revoked, signing them out everywhere.
 */
export async function removeUser(uid: string): Promise<ActionResult<{ deletedAccount: boolean }>> {
  const session = await requireAdmin()

  const parsed = idSchema.safeParse(uid)
  if (!parsed.success) return { success: false, error: 'Invalid user' }
  if (parsed.data === session.uid) {
    return { success: false, error: "You can't remove your own account" }
  }

  try {
    const account = await adminAuth.getUser(parsed.data).catch((error: unknown) => {
      if (isUserNotFound(error)) return null
      throw error
    })
    const neverSignedIn = !account?.metadata.lastSignInTime

    if (account) {
      if (neverSignedIn) await adminAuth.deleteUser(account.uid)
      else await adminAuth.revokeRefreshTokens(account.uid)
    }
    await adminDb.collection('users').doc(parsed.data).delete()

    invalidate(CACHE_TAGS.users)
    revalidatePath('/admin')
    return { success: true, data: { deletedAccount: neverSignedIn } }
  } catch {
    return { success: false, error: 'Failed to remove user' }
  }
}

export async function setUserRole(uid: string, role: UserRole): Promise<ActionResult> {
  const session = await requireAdmin()

  const parsedId = idSchema.safeParse(uid)
  const parsedRole = roleSchema.safeParse(role)
  if (!parsedId.success || !parsedRole.success) return { success: false, error: 'Invalid input' }
  if (parsedId.data === session.uid) {
    return { success: false, error: "You can't change your own role" }
  }

  try {
    await adminDb
      .collection('users')
      .doc(parsedId.data)
      .update({ role: parsedRole.data, updatedAt: FieldValue.serverTimestamp() })
    invalidate(CACHE_TAGS.users)
    revalidatePath('/admin')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to change role' }
  }
}
