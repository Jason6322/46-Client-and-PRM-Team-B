import { describe, expect, it } from 'vitest'
import { byOccurrence, type OrganisationActivity } from '@/features/organisations/types'

const NOW = Date.UTC(2026, 8, 26)
const DAY = 86_400_000

function meeting(id: string, occurredAt: number, createdAt: number): OrganisationActivity {
  return {
    id,
    type: 'Meeting',
    fromStage: null,
    toStage: null,
    occurredAt,
    attendees: null,
    agenda: null,
    notes: null,
    outcome: null,
    actionItems: null,
    nextFollowUp: null,
    meetingLink: null,
    documentLinks: [],
    actorUid: 'u',
    actorLabel: null,
    createdAt,
    deletedAt: null,
  }
}

describe('byOccurrence', () => {
  it('orders by when things happen, not when they were logged', () => {
    // Stored newest-logged first, the way the activities feed returns them.
    const feed = [
      meeting('call-yesterday', NOW - DAY, NOW - DAY / 2),
      meeting('meeting-2027', NOW + 120 * DAY, NOW - DAY),
      meeting('meeting-next-week', NOW + 7 * DAY, NOW - 2 * DAY),
      meeting('email-last-month', NOW - 30 * DAY, NOW - 29 * DAY),
    ]

    const { upcoming, past } = byOccurrence(feed, NOW)

    expect(upcoming.map((a) => a.id)).toEqual(['meeting-next-week', 'meeting-2027'])
    expect(past.map((a) => a.id)).toEqual(['call-yesterday', 'email-last-month'])
  })
})
