'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getClientAuth, getClientDb } from '@/lib/firebase/client'
import {
  signInWithEmail as fbSignInWithEmail,
  signOut as fbSignOut,
  getIdToken,
} from '@/lib/firebase/auth'
import type { AuthContextValue } from '@/types/auth'
import type { UserProfile } from '@/types/firestore'

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Read the signed-in user's profile. Profiles are created only by an admin
 * (/admin, Admin SDK) — sign-up is invite-only — so this never creates one.
 */
async function syncUserProfile(user: User): Promise<UserProfile | null> {
  const profileRef = doc(getClientDb(), 'users', user.uid)
  const snap = await getDoc(profileRef)
  if (!snap.exists()) return null

  const existing = snap.data() as UserProfile

  if (!existing.displayName && user.displayName) {
    await setDoc(
      profileRef,
      {
        displayName: user.displayName,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    return {
      ...existing,
      displayName: user.displayName,
    }
  }

  return existing
}

/**
 * Exchange the ID token for a session cookie. Throws 'not-invited' when the
 * server refuses: the account exists in Firebase Auth but no admin added it.
 */
async function setSessionCookie(): Promise<void> {
  const token = await getIdToken()
  if (!token) return
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  if (response.status === 403) throw new Error('not-invited')
  if (!response.ok) throw new Error('session-failed')
}

async function clearSessionCookie(): Promise<void> {
  await fetch('/api/auth/session', { method: 'DELETE' })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getClientAuth(), async (firebaseUser) => {
      if (firebaseUser) {
        // Treat unverified users as unauthenticated so they cannot access
        // protected routes or receive a session cookie before verifying.
        if (!firebaseUser.emailVerified) {
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }
        try {
          await setSessionCookie()
          const userProfile = await syncUserProfile(firebaseUser)
          if (!userProfile) throw new Error('not-invited')
          setUser(firebaseUser)
          setProfile(userProfile)
        } catch {
          // Not invited, deactivated, or the session could not be created:
          // drop the Firebase sign-in too so the app shows them as signed out.
          await clearSessionCookie()
          await fbSignOut()
          setUser(null)
          setProfile(null)
        }
      } else {
        setUser(null)
        setProfile(null)
        await clearSessionCookie()
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  /** Run a sign-in, then make sure the server will issue a session for it. */
  const withSession = async (signIn: () => Promise<unknown>) => {
    await signIn()
    try {
      // Ensure server session cookie exists before caller redirects to protected routes.
      await setSessionCookie()
    } catch (error) {
      await fbSignOut()
      throw error
    }
  }

  const signInWithEmail = (email: string, password: string) =>
    withSession(() => fbSignInWithEmail(email, password))

  const signOut = async () => {
    // Clear server session cookie first so proxy no longer treats the user as authenticated.
    await clearSessionCookie()
    await fbSignOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
