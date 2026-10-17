import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrganisationActivity, OrganisationListItem } from '@/features/organisations/types'

vi.mock('server-only', () => ({}))

const listRecentActivity = vi.fn()
const listUpcomingMeetings = vi.fn()
vi.mock('@/features/organisations/actions/organisations.actions', () => ({
  listRecentActivity: (input: unknown) => listRecentActivity(input),
  listUpcomingMeetings: (input: unknown) => listUpcomingMeetings(input),
}))

const { followUpsOf, latestActivity, meetingsAcross } = await import('@/features/dashboard/data')

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

  it('asks for exactly the entries it shows, and names each one', async () => {
    listRecentActivity.mockResolvedValue({
      success: true,
      data: [
        { organisationId: 'b', activity: activity('b1', 200) },
        { organisationId: 'a', activity: activity('a1', 100) },
      ],
    })

    const result = await latestActivity([organisation('a'), organisation('b')], 5)

    expect(listRecentActivity).toHaveBeenCalledWith({ limit: 5 })
    expect(result.failed).toBe(false)
    expect(result.activity.map((entry) => entry.activity.id)).toEqual(['b1', 'a1'])
    expect(result.activity[0]).toMatchObject({ organisationId: 'b', organisationName: 'Org b' })
  })

  it('drops entries for organisations it was not given', async () => {
    listRecentActivity.mockResolvedValue({
      success: true,
      data: [{ organisationId: 'gone', activity: activity('g1', 300) }],
    })

    const result = await latestActivity([organisation('a')], 5)

    expect(result.activity).toEqual([])
  })

  it('reports a failure', async () => {
    listRecentActivity.mockResolvedValue({ success: false, error: 'Failed to load activity' })

    const result = await latestActivity([organisation('a')], 5)

    expect(result).toEqual({ activity: [], failed: true })
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
