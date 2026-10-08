import { describe, expect, it } from 'vitest'
import {
  byLeadPriority,
  leadScoreToPriority,
  type LeadPriority,
} from '@/features/organisations/constants'

describe('byLeadPriority', () => {
  it('puts Urgent first and unset last', () => {
    const priorities: (LeadPriority | null)[] = ['Low', null, 'Urgent', 'Medium', 'High']
    expect([...priorities].sort(byLeadPriority)).toEqual(['Urgent', 'High', 'Medium', 'Low', null])
  })
})

describe('leadScoreToPriority', () => {
  it('maps the old 0–100 score onto Low, Medium and High', () => {
    expect(leadScoreToPriority(0)).toBe('Low')
    expect(leadScoreToPriority(33)).toBe('Low')
    expect(leadScoreToPriority(34)).toBe('Medium')
    expect(leadScoreToPriority(66)).toBe('Medium')
    expect(leadScoreToPriority(67)).toBe('High')
  })

  it('never decides an organisation is Urgent', () => {
    expect(leadScoreToPriority(100)).toBe('High')
  })
})
