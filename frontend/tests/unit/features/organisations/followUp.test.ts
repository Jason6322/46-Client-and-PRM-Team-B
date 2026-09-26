import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dateOnlyToDate,
  describeDue,
  isDueToday,
  isOverdue,
} from '@/features/organisations/followUp'

const due = (day: string) => dateOnlyToDate(day).getTime()

describe('follow-up dates', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 2026-09-26 in UTC, but already 2026-09-27 in Melbourne (UTC+10).
    vi.setSystemTime(new Date('2026-09-26T20:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('works out today in the zone it is given, not the runtime zone', () => {
    expect(isDueToday(due('2026-09-26'), 'UTC')).toBe(true)
    expect(isDueToday(due('2026-09-27'), 'Australia/Melbourne')).toBe(true)
    expect(isOverdue(due('2026-09-26'), 'Australia/Melbourne')).toBe(true)
    expect(isOverdue(due('2026-09-26'), 'UTC')).toBe(false)
  })

  it('describes future due dates as upcoming, not as past', () => {
    expect(describeDue(due('2026-09-26'), 'UTC')).toBe('Due today')
    expect(describeDue(due('2026-09-27'), 'UTC')).toBe('Due tomorrow')
    expect(describeDue(due('2026-10-03'), 'UTC')).toBe('Due in 7d')
    expect(describeDue(due('2026-09-24'), 'UTC')).toBe('Overdue by 2d')
  })
})
