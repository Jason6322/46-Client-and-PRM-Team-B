import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const cookieSet = vi.fn()
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ set: cookieSet, delete: vi.fn() })),
}))

const profileGet = vi.fn()
const profileUpdate = vi.fn()
vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
    createSessionCookie: vi.fn(),
  },
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({ get: profileGet, update: profileUpdate })),
    })),
  },
}))

import { POST } from '@/app/api/auth/session/route'
import { adminAuth } from '@/lib/firebase/admin'

const verifyIdToken = vi.mocked(adminAuth.verifyIdToken)
const createSessionCookie = vi.mocked(adminAuth.createSessionCookie)

function profile(data: Record<string, unknown> | null) {
  return { exists: data !== null, get: (key: string) => data?.[key] }
}

function request(body: unknown, origin: string | null = 'http://localhost:3000') {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    host: 'localhost:3000',
  }
  if (origin) headers.origin = origin
  return new NextRequest('http://localhost:3000/api/auth/session', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/session — invite-only gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyIdToken.mockResolvedValue({ uid: 'u1', email_verified: true } as never)
    createSessionCookie.mockResolvedValue('session-cookie')
    profileGet.mockResolvedValue(profile({ role: 'user', deletedAt: null }))
  })

  it('issues a session cookie to an active, verified member', async () => {
    const res = await POST(request({ token: 'id-token' }))

    expect(res.status).toBe(200)
    expect(cookieSet).toHaveBeenCalledWith(
      '__session',
      'session-cookie',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' })
    )
  })

  it('returns the profile so the browser need not read it again', async () => {
    profileGet.mockResolvedValue(profile({ role: 'admin', displayName: 'Jason', deletedAt: null }))

    const res = await POST(request({ token: 'id-token' }))

    expect(await res.json()).toEqual({
      success: true,
      profile: { displayName: 'Jason', role: 'admin' },
    })
    expect(profileUpdate).not.toHaveBeenCalled()
  })

  it('backfills a missing display name from the Auth account', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email_verified: true, name: 'Saneli' } as never)
    profileGet.mockResolvedValue(profile({ role: 'user', displayName: null, deletedAt: null }))

    const res = await POST(request({ token: 'id-token' }))

    expect(profileUpdate).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Saneli' }))
    expect((await res.json()).profile).toEqual({ displayName: 'Saneli', role: 'user' })
  })

  it('refuses an account no admin has added', async () => {
    profileGet.mockResolvedValue(profile(null))

    const res = await POST(request({ token: 'id-token' }))

    expect(res.status).toBe(403)
    expect((await res.json()).detail).toBe('not-invited')
    expect(cookieSet).not.toHaveBeenCalled()
  })

  it('refuses a deactivated member', async () => {
    profileGet.mockResolvedValue(profile({ role: 'user', deletedAt: { seconds: 1 } }))

    const res = await POST(request({ token: 'id-token' }))

    expect(res.status).toBe(403)
    expect(cookieSet).not.toHaveBeenCalled()
  })

  it('refuses an unverified email even when a profile exists', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email_verified: false } as never)

    const res = await POST(request({ token: 'id-token' }))

    expect(res.status).toBe(403)
    expect(createSessionCookie).not.toHaveBeenCalled()
  })

  it('refuses a cross-site post (login CSRF)', async () => {
    const res = await POST(request({ token: 'id-token' }, 'https://evil.example'))

    expect(res.status).toBe(403)
    expect(verifyIdToken).not.toHaveBeenCalled()
  })

  it('refuses a malformed origin', async () => {
    const res = await POST(request({ token: 'id-token' }, 'null'))

    expect(res.status).toBe(403)
  })

  it('returns 401 for an invalid or revoked token', async () => {
    verifyIdToken.mockRejectedValue(
      Object.assign(new Error('revoked'), { code: 'auth/id-token-revoked' })
    )

    const res = await POST(request({ token: 'bad' }))

    expect(res.status).toBe(401)
    expect(cookieSet).not.toHaveBeenCalled()
  })

  it('returns 503 for a temporary failure, so the browser keeps the sign-in', async () => {
    profileGet.mockRejectedValue(Object.assign(new Error('Quota exceeded'), { code: 8 }))

    const res = await POST(request({ token: 'id-token' }))

    expect(res.status).toBe(503)
    expect(cookieSet).not.toHaveBeenCalled()
  })

  it('rejects a non-string token', async () => {
    const res = await POST(request({ token: { $gt: '' } }))

    expect(res.status).toBe(400)
  })
})
