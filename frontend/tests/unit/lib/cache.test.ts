import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('@/lib/cache')
vi.mock('server-only', () => ({}))

const unstable_cache = vi.fn((read: (...args: unknown[]) => unknown) => read)
const revalidateTag = vi.fn()
vi.mock('next/cache', () => ({
  unstable_cache: (...args: unknown[]) =>
    unstable_cache(...(args as [(...args: unknown[]) => unknown])),
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
}))

const { CACHE_SECONDS, CACHE_TAGS, activitiesTag, cached, invalidate } = await import('@/lib/cache')

describe('lib/cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the short backstop outside production', () => {
    expect(CACHE_SECONDS).toBe(300)
  })

  it('wraps a read with its key, tags and the backstop expiry', () => {
    const read = async () => 'organisations'
    cached(read, 'organisations-all', [CACHE_TAGS.organisations])

    expect(unstable_cache).toHaveBeenCalledWith(read, ['organisations-all'], {
      tags: ['organisations'],
      revalidate: CACHE_SECONDS,
    })
  })

  it('derives per-record tags from the arguments on each call', async () => {
    const read = async (organisationId: string) => [organisationId]
    const activities = cached(read, 'organisation-activities', (organisationId) => [
      activitiesTag(organisationId),
    ])

    expect(unstable_cache).not.toHaveBeenCalled()
    await expect(activities('org-1')).resolves.toEqual(['org-1'])
    await activities('org-2')

    expect(unstable_cache).toHaveBeenNthCalledWith(1, read, ['organisation-activities'], {
      tags: ['activities:org-1'],
      revalidate: CACHE_SECONDS,
    })
    expect(unstable_cache).toHaveBeenNthCalledWith(2, read, ['organisation-activities'], {
      tags: ['activities:org-2'],
      revalidate: CACHE_SECONDS,
    })
  })

  it('expires every tag immediately so the writer sees their change', () => {
    invalidate(CACHE_TAGS.activityFeed, activitiesTag('org-1'))

    expect(revalidateTag).toHaveBeenCalledTimes(2)
    expect(revalidateTag).toHaveBeenCalledWith('activity-feed', { expire: 0 })
    expect(revalidateTag).toHaveBeenCalledWith('activities:org-1', { expire: 0 })
  })
})
