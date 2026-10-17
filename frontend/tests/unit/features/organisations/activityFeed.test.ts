import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Timestamp } from 'firebase-admin/firestore'

/**
 * listRecentActivity and listUpcomingMeetings: one collection-group query
 * across every organisation, falling back to one query per organisation when
 * the collection-group index isn't deployed (FAILED_PRECONDITION, code 9).
 */

const collectionGroupGet = vi.fn()
const perOrganisationGet = vi.fn()
const organisationsGet = vi.fn()

/** A query whose builder methods chain and whose get() is `get`. */
function query(get: () => unknown) {
  const self: Record<string, unknown> = { get }
  for (const method of ['orderBy', 'limit', 'where']) self[method] = () => self
  return self
}

vi.mock('@/actions/auth.actions', () => ({ requireAuth: vi.fn().mockResolvedValue({ uid: 'u1' }) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collectionGroup: () => query(() => collectionGroupGet()),
    collection: () => ({
      orderBy: () => ({ get: () => organisationsGet() }),
      doc: (organisationId: string) => ({
        collection: () => query(() => perOrganisationGet(organisationId)),
      }),
    }),
  },
}))

const { listRecentActivity, listUpcomingMeetings } =
  await import('@/features/organisations/actions/organisations.actions')

const at = (millis: number) => Timestamp.fromMillis(millis)

function organisationDoc(id: string, archived = false) {
  return {
    id,
    data: () => ({
      name: `Org ${id}`,
      lastActivityAt: at(1),
      deletedAt: archived ? at(1) : null,
    }),
  }
}

function activityDoc(
  id: string,
  organisationId: string,
  fields: { createdAt?: number; occurredAt?: number; type?: string; archived?: boolean }
) {
  return {
    id,
    data: () => ({
      type: fields.type ?? 'Note',
      createdAt: at(fields.createdAt ?? 0),
      occurredAt: fields.occurredAt === undefined ? null : at(fields.occurredAt),
      deletedAt: fields.archived ? at(1) : null,
    }),
    ref: { parent: { parent: { id: organisationId, parent: { id: 'organisations' } } } },
  }
}

const missingIndex = Object.assign(new Error('The query requires an index'), { code: 9 })

describe('activity across organisations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    organisationsGet.mockResolvedValue({
      docs: [organisationDoc('a'), organisationDoc('b'), organisationDoc('old', true)],
    })
  })

  describe('listRecentActivity', () => {
    it('reads one collection-group query and drops archived entries and organisations', async () => {
      collectionGroupGet.mockResolvedValue({
        docs: [
          activityDoc('b2', 'b', { createdAt: 400 }),
          activityDoc('old1', 'old', { createdAt: 300 }),
          activityDoc('a2', 'a', { createdAt: 200, archived: true }),
          activityDoc('a1', 'a', { createdAt: 100 }),
          activityDoc('b1', 'b', { createdAt: 50 }),
        ],
      })

      const result = await listRecentActivity({ limit: 2 })

      expect(result.success).toBe(true)
      expect(result.data?.map((entry) => [entry.organisationId, entry.activity.id])).toEqual([
        ['b', 'b2'],
        ['a', 'a1'],
      ])
      expect(perOrganisationGet).not.toHaveBeenCalled()
    })

    it('falls back to each organisation when the index is not deployed', async () => {
      collectionGroupGet.mockRejectedValue(missingIndex)
      perOrganisationGet.mockImplementation(async (organisationId: string) => ({
        docs:
          organisationId === 'a'
            ? [activityDoc('a1', 'a', { createdAt: 100 })]
            : [activityDoc('b1', 'b', { createdAt: 200 })],
      }))

      const result = await listRecentActivity({ limit: 5 })

      expect(result.data?.map((entry) => entry.activity.id)).toEqual(['b1', 'a1'])
      // Active organisations only — the archived one isn't read.
      expect(perOrganisationGet.mock.calls.map(([id]) => id).sort()).toEqual(['a', 'b'])
    })

    it('reports other errors instead of falling back', async () => {
      collectionGroupGet.mockRejectedValue(new Error('RESOURCE_EXHAUSTED'))

      const result = await listRecentActivity({ limit: 5 })

      expect(result).toEqual({ success: false, error: 'Failed to load activity' })
      expect(perOrganisationGet).not.toHaveBeenCalled()
    })

    it('rejects an unbounded limit', async () => {
      const result = await listRecentActivity({ limit: 10_000 })

      expect(result.success).toBe(false)
      expect(collectionGroupGet).not.toHaveBeenCalled()
    })
  })

  describe('listUpcomingMeetings', () => {
    it('keeps live meetings in range for the requested organisations, soonest first', async () => {
      collectionGroupGet.mockResolvedValue({
        docs: [
          activityDoc('m2', 'b', { type: 'Meeting', occurredAt: 2_000_000 }),
          activityDoc('call', 'a', { type: 'Call', occurredAt: 1_500_000 }),
          activityDoc('m1', 'a', { type: 'Meeting', occurredAt: 1_000_000 }),
          activityDoc('gone', 'a', { type: 'Meeting', occurredAt: 1_200_000, archived: true }),
          activityDoc('other', 'old', { type: 'Meeting', occurredAt: 1_100_000 }),
          activityDoc('late', 'a', { type: 'Meeting', occurredAt: 9_000_000 }),
        ],
      })

      const result = await listUpcomingMeetings({
        organisationIds: ['a', 'b'],
        from: 900_000,
        to: 2_100_000,
      })

      expect(result.data?.map((entry) => entry.activity.id)).toEqual(['m1', 'm2'])
      expect(perOrganisationGet).not.toHaveBeenCalled()
    })

    it('falls back to one query per organisation when the index is not deployed', async () => {
      collectionGroupGet.mockRejectedValue(missingIndex)
      perOrganisationGet.mockImplementation(async (organisationId: string) => ({
        docs:
          organisationId === 'a'
            ? [activityDoc('m1', 'a', { type: 'Meeting', occurredAt: 1_000_000 })]
            : [],
      }))

      const result = await listUpcomingMeetings({
        organisationIds: ['a', 'b'],
        from: 900_000,
        to: 2_100_000,
      })

      expect(result.data?.map((entry) => entry.activity.id)).toEqual(['m1'])
      expect(perOrganisationGet).toHaveBeenCalledTimes(2)
    })
  })
})
