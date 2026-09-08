import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/me/route'
import { adminAuth } from '@/lib/firebase/admin'

const verifyIdToken = vi.mocked(adminAuth.verifyIdToken)

function request(headers: Record<string, string> = {}) {
  return new NextRequest('https://example.com/api/me', { headers })
}

describe('GET /api/me', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns the caller identity for a valid bearer token', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'user-123', email: 'a@b.com' } as never)

    const res = await GET(request({ authorization: 'Bearer good-token' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ uid: 'user-123', email: 'a@b.com' })
    expect(verifyIdToken).toHaveBeenCalledWith('good-token')
  })

  it('returns null email when the token carries none', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'user-123', email: undefined } as never)

    const res = await GET(request({ authorization: 'Bearer good-token' }))
    expect(await res.json()).toEqual({ uid: 'user-123', email: null })
  })

  it('401s when the Authorization header is missing', async () => {
    const res = await GET(request())
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ status: 401, title: 'Unauthorized' })
    expect(verifyIdToken).not.toHaveBeenCalled()
  })

  it('401s when the scheme is not Bearer', async () => {
    const res = await GET(request({ authorization: 'Basic abc' }))
    expect(res.status).toBe(401)
    expect(verifyIdToken).not.toHaveBeenCalled()
  })

  it('401s when token verification fails', async () => {
    verifyIdToken.mockRejectedValue(new Error('expired'))

    const res = await GET(request({ authorization: 'Bearer bad-token' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ status: 401 })
  })
})
