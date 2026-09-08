import 'server-only'
import type { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'

/** The authenticated caller resolved from an `Authorization: Bearer` header. */
export interface BearerUser {
  uid: string
  email: string | undefined
  claims: Record<string, unknown>
}

/**
 * Verifies the `Authorization: Bearer <Firebase ID token>` header on an API
 * request. Returns null when the header is missing, malformed, or the token
 * fails verification — callers render that as a 401 via `unauthorized()`.
 *
 * This is the Route Handler counterpart to the backend's auth middleware
 * (`backend/src/middleware/auth.ts`); keep the two in step.
 */
export async function verifyBearer(req: NextRequest): Promise<BearerUser | null> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null

  try {
    const decoded = await adminAuth.verifyIdToken(header.slice(7))
    return { uid: decoded.uid, email: decoded.email, claims: decoded as Record<string, unknown> }
  } catch {
    return null
  }
}
