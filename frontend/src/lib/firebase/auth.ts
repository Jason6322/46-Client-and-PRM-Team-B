import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth'
import { getClientAuth } from './client'

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(getClientAuth(), email, password)

  await result.user.reload()
  if (!result.user.emailVerified) {
    await firebaseSignOut(getClientAuth())
    throw new Error('email-not-verified')
  }

  return result.user
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getClientAuth())
}

/**
 * Send a password reset email — also how invited people set their first
 * password. After choosing one, Firebase's page shows a "Continue" button back
 * to this site's sign-in page, so the email doesn't leave people stranded on a
 * firebaseapp.com page.
 *
 * The link only works for domains listed under Authentication → Settings →
 * Authorized domains; for any other, the email is sent without it rather than
 * not at all.
 */
export async function resetPassword(email: string): Promise<void> {
  const auth = getClientAuth()
  try {
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/auth/signin`,
    })
  } catch (error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null
    if (code !== 'auth/unauthorized-continue-uri') throw error
    await sendPasswordResetEmail(auth, email)
  }
}

export async function getIdToken(): Promise<string | null> {
  const user = getClientAuth().currentUser
  if (!user) return null
  return user.getIdToken()
}
