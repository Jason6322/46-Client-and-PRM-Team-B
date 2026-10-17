import { type NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = '__session'
const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000 // 14 days

function isSameHost(origin: string, host: string | null) {
  try {
    return host !== null && new URL(origin).host === host
  } catch {
    return false // e.g. the literal "null" origin of a sandboxed frame
  }
}

/**
 * POST /api/auth/session
 * Exchange a Firebase ID token for a server-side session cookie.
 */
export async function POST(req: NextRequest) {
  // Login CSRF: a cross-site form could otherwise post the attacker's own token
  // and sign the victim's browser into the attacker's account. Browsers always
  // send Origin on a POST; non-browser callers can't ride a victim's cookies.
  const origin = req.headers.get('origin')
  if (origin && !isSameHost(origin, req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { token } = (await req.json()) as { token?: unknown }

    if (typeof token !== 'string' || !token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    // Invite-only: anyone holding the public API key can create a Firebase Auth
    // account without the app, so access is decided here — only people an admin
    // added at /admin have a users/{uid} profile, and only active ones get in.
    // The email must be verified server-side too: the sign-in page's check runs
    // in the browser, and an account made through the API for someone else's
    // address is unverified.
    const decoded = await adminAuth.verifyIdToken(token, true)
    if (decoded.email_verified !== true) {
      return NextResponse.json({ error: 'not-invited' }, { status: 403 })
    }
    const { uid } = decoded
    const profile = await adminDb.collection('users').doc(uid).get()
    if (!profile.exists || profile.get('deletedAt') != null) {
      return NextResponse.json({ error: 'not-invited' }, { status: 403 })
    }

    // Verify the ID token and create a session cookie
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn: SESSION_DURATION_MS,
    })

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_DURATION_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session creation failed:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

/**
 * DELETE /api/auth/session
 * Clear the session cookie (sign out server-side).
 */
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  return NextResponse.json({ success: true })
}
