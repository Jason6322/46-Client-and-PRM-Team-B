import type { User } from 'firebase/auth'
import type { UserRole } from './firestore'

/**
 * What the client knows about the signed-in user's profile, as returned by
 * POST /api/auth/session — the browser never reads users/{uid} itself.
 */
export interface SessionProfile {
  displayName: string | null
  role: UserRole
}

export interface AuthContextValue {
  user: User | null
  profile: SessionProfile | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export interface SessionPayload {
  uid: string
  email: string
  expiresAt: number
}
