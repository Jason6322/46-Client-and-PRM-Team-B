'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { getClientAuth } from '@/lib/firebase/client'
import {
  signInWithEmail as fbSignInWithEmail,
  signOut as fbSignOut,
  getIdToken,
} from '@/lib/firebase/auth'
import type { AuthContextValue, SessionProfile } from '@/types/auth'

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Exchange the ID token for a session cookie, and get back the user's profile.
 * Throws 'not-invited' when the server refuses: the account exists in Firebase
 * Auth but no admin added it, or it was deactivated.
 *
 * The server reads users/{uid} to decide, and returns what the UI needs from
 * it, so the browser doesn't read the profile again — one Firestore read per
 * page load.
 */
async function createSession(): Promise<SessionProfile> {
  const token = await getIdToken()
  if (!token) throw new Error('session-failed')
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  if (response.status === 403) throw new Error('not-invited')
  if (!response.ok) throw new Error('session-failed')
  const { profile } = (await response.json()) as { profile: SessionProfile }
  return profile
}

/**
 * Signing in fires onAuthStateChanged while signInWithEmail is also making
 * sure of the session, so both would POST (and read the profile). They share
 * one request per user instead; a failed one is forgotten so it can be retried.
 */
let pendingSession: { uid: string; promise: Promise<SessionProfile> } | null = null

function sessionFor(uid: string): Promise<SessionProfile> {
  if (pendingSession?.uid !== uid) {
    const promise = createSession().catch((error: unknown) => {
      if (pendingSession?.promise === promise) pendingSession = null
      throw error
    })
    pendingSession = { uid, promise }
  }
  return pendingSession.promise
}

async function clearSessionCookie(): Promise<void> {
  pendingSession = null
  await fetch('/api/auth/session', { method: 'DELETE' })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<SessionProfile | null>(null)
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
          const sessionProfile = await sessionFor(firebaseUser.uid)
          setUser(firebaseUser)
          setProfile(sessionProfile)
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

  const signInWithEmail = async (email: string, password: string) => {
    const signedIn = await fbSignInWithEmail(email, password)
    try {
      // Ensure the session cookie exists before the caller redirects to a
      // protected route.
      await sessionFor(signedIn.uid)
    } catch (error) {
      await fbSignOut()
      throw error
    }
  }

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
