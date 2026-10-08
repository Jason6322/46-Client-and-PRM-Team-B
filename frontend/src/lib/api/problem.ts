import { NextResponse } from 'next/server'

/**
 * RFC 9457 Problem Details response body — the one error contract every
 * API Route Handler returns.
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
