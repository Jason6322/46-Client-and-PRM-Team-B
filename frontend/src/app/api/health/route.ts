import { NextResponse } from 'next/server'

// The timestamp must be computed per request, never baked in at build time.
export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 * Returns service health status. No auth required.
 *
 * Port of `backend/src/routes/health.ts` — same response shape, served by
 * Vercel so it is reachable on the production domain without Cloud Functions.
 */
export function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
  })
}
