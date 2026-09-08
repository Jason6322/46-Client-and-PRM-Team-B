import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  it('returns ok status without requiring auth', async () => {
    const res = GET()
    expect(res.status).toBe(200)

    const body = (await res.json()) as { status: string; timestamp: string; environment: string }
    expect(body.status).toBe('ok')
    expect(body.environment).toBeTypeOf('string')
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false)
  })
})
