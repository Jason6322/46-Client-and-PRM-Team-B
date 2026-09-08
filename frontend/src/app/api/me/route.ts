import { type NextRequest, NextResponse } from 'next/server'
import { verifyBearer } from '@/lib/api/bearer'
import { unauthorized } from '@/lib/api/problem'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me
 * Returns the authenticated caller's identity.
 *
 * Port of `backend/src/routes/me.ts`. Requires `Authorization: Bearer <ID token>`.
 */
export async function GET(req: NextRequest) {
  const user = await verifyBearer(req)
  if (!user) return unauthorized('Missing, invalid, or expired Authorization header')

  return NextResponse.json({ uid: user.uid, email: user.email ?? null })
}
