import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'

function request(path: string, cookie?: string) {
  const headers: Record<string, string> = {}
  if (cookie) headers.cookie = `__session=${cookie}`
  return new NextRequest(`http://localhost:3000${path}`, { headers })
}

describe('proxy', () => {
  it('sends a visitor without a cookie to sign in', () => {
    const res = proxy(request('/dashboard'))

    expect(res.headers.get('location')).toBe(
      'http://localhost:3000/auth/signin?redirect=%2Fdashboard'
    )
  })

  it('sends a signed-in visitor from sign in to the dashboard', () => {
    const res = proxy(request('/auth/signin', 'cookie'))

    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard')
  })

  it('deletes a rejected cookie instead of looping back to the dashboard', () => {
    const res = proxy(request('/auth/signin?expired=1', 'dead-cookie'))

    expect(res.headers.get('location')).toBeNull()
    expect(res.cookies.get('__session')?.value).toBe('')
  })
})
