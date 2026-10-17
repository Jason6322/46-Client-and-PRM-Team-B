import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrganisationActivity, OrganisationListItem } from '@/features/organisations/types'

vi.mock('server-only', () => ({}))

const listOrganisationActivities = vi.fn()
const listUpcomingMeetings = vi.fn()
vi.mock('@/features/organisations/actions/organisations.actions', () => ({
  listOrganisationActivities: (id: string) => listOrganisationActivities(id),
  listUpcomingMeetings: (input: unknown) => listUpcomingMeetings(input),
}))

const { activityAcross, followUpsOf, meetingsAcross } = await import('@/features/dashboard/data')

function organisation(id: string, overrides: Partial<OrganisationListItem> = {}) {
  return { id, name: `Org ${id}`, nextActionDueAt: null, ...overrides } as OrganisationListItem
}

function activity(id: string, createdAt: number, deletedAt: number | null = null) {
  return { id, createdAt, deletedAt, type: 'Note' } as OrganisationActivity
}

describe('dashboard data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('merges activity across organisations, newest first, without archived entries', async () => {
    listOrganisationActivities.mockImplementation(async (id: string) => ({
      success: true,
      data:
        id === 'a'
          ? [activity('a1', 100), activity('a2', 300, 999)]
          : [activity('b1', 200), activity('b2', 50)],
    }))

    const result = await activityAcross([organisation('a'), organisation('b')])

    expect(result.failed).toBe(false)
    expect(result.activity.map((entry) => entry.activity.id)).toEqual(['b1', 'a1', 'b2'])
    expect(result.activity[0]).toMatchObject({ organisationId: 'b', organisationName: 'Org b' })
  })

  it('reports a partial failure but keeps what did load', async () => {
    listOrganisationActivities.mockImplementation(async (id: string) =>
      id === 'a'
        ? { success: true, data: [activity('a1', 100)] }
        : { success: false, error: 'Failed to load activity' }
    )

    const result = await activityAcross([organisation('a'), organisation('b')])

    expect(result.failed).toBe(true)
    expect(result.activity).toHaveLength(1)
  })

  it('names each meeting after its organisation', async () => {
    listUpcomingMeetings.mockResolvedValue({
      success: true,
      data: [{ organisationId: 'b', activity: activity('m1', 1) }],
    })

    const result = await meetingsAcross([organisation('a'), organisation('b')], 0, 10)

    expect(listUpcomingMeetings).toHaveBeenCalledWith({
      organisationIds: ['a', 'b'],
      from: 0,
      to: 10,
    })
    expect(result).toEqual({
      meetings: [{ organisationId: 'b', organisationName: 'Org b', activity: activity('m1', 1) }],
      error: null,
    })
  })

  it('passes a meetings error through', async () => {
    listUpcomingMeetings.mockResolvedValue({ success: false, error: 'Invalid meeting range' })

    const result = await meetingsAcross([organisation('a')], 0, 10)

    expect(result).toEqual({ meetings: [], error: 'Invalid meeting range' })
  })

  it('lists only organisations with a due date, most urgent first', () => {
    const result = followUpsOf([
      organisation('later', { nextActionDueAt: 300 }),
      organisation('none'),
      organisation('soon', { nextActionDueAt: 100 }),
    ])

    expect(result.map((entry) => entry.id)).toEqual(['soon', 'later'])
  })
})
