'use server'

import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'
import type { ActionResult } from '@/types'

const SESSION_COOKIE_NAME = '__session'

/**
 * Verify the current session cookie and return the decoded token.
 * Use this in Server Components and Server Actions to authenticate requests.
 */
export async function getServerSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionCookie) return null

  return verifySessionOnce(sessionCookie)
}

/**
 * Every Server Action calls requireAuth(), and a page calls several, so
 * verification is memoised for the request (React cache). checkRevoked makes
 * each verification a round trip to Firebase Auth; the dashboard made about a
 * dozen per render. Scoped to one request, so revocation still applies to the
 * next one.
 */
const verifySessionOnce = cache(async (sessionCookie: string) => {
  try {
    return await adminAuth.verifySessionCookie(sessionCookie, true)
  } catch {
    return null
  }
})

/** The caller's profile, read at most once per request (React cache). */
const profileOnce = cache((uid: string) => adminDb.collection('users').doc(uid).get())

/**
 * Require authentication in a Server Action or Server Component.
 * Redirects to the sign-in page if not authenticated. ?expired tells the proxy
 * to delete a cookie that is present but no longer valid — it can't be deleted
 * from here during a render, and keeping it would make the proxy send the
 * sign-in page straight back to the dashboard.
 */
export async function requireAuth() {
  const session = await getServerSession()
  if (!session) {
    redirect('/auth/signin?expired=1')
  }
  return session
}

/**
 * Require an admin (users/{uid}.role == 'admin'). Anyone else gets a 404, so
 * the admin screens don't advertise themselves.
 */
export async function requireAdmin() {
  const session = await requireAuth()
  const profile = await profileOnce(session.uid)
  if (profile.get('role') !== 'admin' || profile.get('deletedAt') != null) {
    notFound()
  }
  return session
}

/**
 * Server-side sign out: clears the session cookie.
 */
export async function serverSignOut(): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE_NAME)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to sign out' }
  }
}
