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

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(getClientAuth(), email)
}

export async function getIdToken(): Promise<string | null> {
  const user = getClientAuth().currentUser
  if (!user) return null
  return user.getIdToken()
}
