import { NextResponse } from 'next/server'

/**
 * RFC 9457 Problem Details response body.
 * Mirrors the shape produced by the backend's errorHandler middleware
 * (`backend/src/middleware/errorHandler.ts`) so clients see one error
 * contract regardless of which runtime serves the route.
 */
export interface ProblemDetails {
  type: string
  title: string
  status: number
  detail: string
}

export function problem(
  status: number,
  title: string,
  detail: string
): NextResponse<ProblemDetails> {
  return NextResponse.json(
    { type: `https://httpstatuses.io/${status}`, title, status, detail },
    { status }
  )
}

export const unauthorized = (detail = 'Unauthorized'): NextResponse<ProblemDetails> =>
  problem(401, 'Unauthorized', detail)
