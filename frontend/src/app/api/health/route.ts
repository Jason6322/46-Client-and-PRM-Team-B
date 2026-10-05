import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

// The timestamp must be computed per request, never baked in at build time.
export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 * Returns service health status, including a live Firestore connectivity
 * check. No auth required.
 */
export async function GET() {
  const base = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
  }

  try {
    await adminDb.listCollections()
    return NextResponse.json({ status: 'ok', database: 'connected', ...base })
  } catch {
    return NextResponse.json({ status: 'error', database: 'unreachable', ...base }, { status: 503 })
  }
}
