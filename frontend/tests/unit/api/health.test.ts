import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/health/route'
import { adminDb } from '@/lib/firebase/admin'

const listCollections = vi.mocked(adminDb.listCollections)

describe('GET /api/health', () => {
  beforeEach(() => {
    listCollections.mockReset()
    listCollections.mockResolvedValue([])
  })

  it('returns ok status without requiring auth', async () => {
    const res = await GET()
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      status: string
      database: string
      timestamp: string
      environment: string
    }
    expect(body.status).toBe('ok')
    expect(body.database).toBe('connected')
    expect(body.environment).toBeTypeOf('string')
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false)
  })

  it('returns 503 when Firestore is unreachable', async () => {
    listCollections.mockRejectedValue(new Error('no credentials'))

    const res = await GET()
    expect(res.status).toBe(503)

    const body = (await res.json()) as { status: string; database: string }
    expect(body.status).toBe('error')
    expect(body.database).toBe('unreachable')
  })
})
