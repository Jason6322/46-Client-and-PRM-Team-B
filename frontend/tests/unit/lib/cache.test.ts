import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('@/lib/cache')
vi.mock('server-only', () => ({}))

const unstable_cache = vi.fn((read: unknown) => read)
const revalidateTag = vi.fn()
vi.mock('next/cache', () => ({
  unstable_cache: (...args: unknown[]) => unstable_cache(...(args as [unknown])),
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
}))

const { CACHE_SECONDS, CACHE_TAGS, cached, invalidate } = await import('@/lib/cache')

describe('lib/cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('wraps a read with its key, tags and the backstop expiry', () => {
    const read = async (id: string) => id
    cached(read, 'organisation-activities', [CACHE_TAGS.activities])

    expect(unstable_cache).toHaveBeenCalledWith(read, ['organisation-activities'], {
      tags: ['activities'],
      revalidate: CACHE_SECONDS,
    })
  })

  it('expires every tag immediately so the writer sees their change', () => {
    invalidate(CACHE_TAGS.organisations, CACHE_TAGS.activities)

    expect(revalidateTag).toHaveBeenCalledTimes(2)
    expect(revalidateTag).toHaveBeenCalledWith('organisations', { expire: 0 })
    expect(revalidateTag).toHaveBeenCalledWith('activities', { expire: 0 })
  })
})
