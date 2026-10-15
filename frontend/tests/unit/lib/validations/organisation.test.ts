import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createOrganisationSchema,
  logActivitySchema,
  organisationFormSchema,
  relationshipManagementSchema,
  toLogActivityInput,
  updateOrganisationSchema,
  type LogActivityFormValues,
} from '@/lib/validations/organisation'

// The form schema is refined, so its fields sit on the inner object.
const formWebsite = organisationFormSchema.innerType().shape.website

describe('organisation website', () => {
  it('rejects script and data URLs, which would run when rendered as a link', () => {
    for (const website of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>']) {
      expect(updateOrganisationSchema.safeParse({ website }).success).toBe(false)
      expect(formWebsite.safeParse(website).success).toBe(false)
    }
  })

  it('accepts http(s) links and an empty value', () => {
    expect(updateOrganisationSchema.parse({ website: 'https://example.org' }).website).toBe(
      'https://example.org'
    )
    expect(updateOrganisationSchema.parse({ website: '' }).website).toBeNull()
    expect(formWebsite.safeParse('').success).toBe(true)
  })
})

describe('organisation tags', () => {
  it('stores each tag once', () => {
    expect(updateOrganisationSchema.parse({ tags: ['test', 'test', 'one'] }).tags).toEqual([
      'test',
      'one',
    ])
  })
})

describe('relationship owner', () => {
  const base = {
    name: 'GreenLeaf Foods',
    type: 'Client',
    industry: null,
    country: 'Australia',
    website: null,
    primaryContact: { name: 'J. Alvarez', role: null, email: null, phone: null },
    notes: null,
  }

  it('is no longer needed to add an organisation', () => {
    expect(createOrganisationSchema.parse(base).relationshipOwner).toBeNull()
  })

  it('is left alone by an edit that does not send it', () => {
    expect(updateOrganisationSchema.parse({ name: 'Renamed' })).not.toHaveProperty(
      'relationshipOwner'
    )
  })

  it('is cleared, not stored as an empty string, on the Relationships screen', () => {
    const parsed = relationshipManagementSchema.parse({
      businessResearchNotes: null,
      qualificationInfo: null,
      leadPriority: null,
      researchStatus: null,
      businessBrief: null,
      outreachStatus: null,
      communicationRecord: null,
      followUpStatus: null,
      relationshipNotes: null,
      relationshipOwner: '  ',
      nextAction: null,
    })
    expect(parsed.relationshipOwner).toBeNull()
  })
})

describe('lead priority', () => {
  it('accepts Urgent and rejects the old numeric score', () => {
    const field = relationshipManagementSchema.shape.leadPriority
    expect(field.safeParse('Urgent').success).toBe(true)
    expect(field.safeParse(null).success).toBe(true)
    expect(field.safeParse(82).success).toBe(false)
  })
})

describe('logging an activity', () => {
  const activity = {
    type: 'Meeting',
    occurredAt: '2026-08-29T00:00:00.000Z',
    attendees: null,
    agenda: null,
    notes: null,
    outcome: null,
    actionItems: null,
    nextFollowUp: null,
    meetingLink: null,
  }

  it('requires a responsible team member', () => {
    expect(logActivitySchema.safeParse({ ...activity, responsible: ' ' }).success).toBe(false)
    expect(logActivitySchema.parse({ ...activity, responsible: 'D. Zytsel' }).responsible).toBe(
      'D. Zytsel'
    )
  })

  // A bare datetime-local value would be read in the server's timezone, which
  // is UTC on Vercel — a 10am meeting in Melbourne was stored as 9pm.
  it('rejects a date and time with no timezone', () => {
    const parsed = logActivitySchema.safeParse({
      ...activity,
      responsible: 'D. Zytsel',
      occurredAt: '2026-10-20T10:00',
    })
    expect(parsed.success).toBe(false)
  })
})

describe('sending a logged activity from the form', () => {
  const values: LogActivityFormValues = {
    type: 'Meeting',
    occurredAt: '2026-10-20T10:00',
    responsible: 'D. Zytsel',
    attendees: '',
    agenda: '',
    notes: '',
    outcome: '',
    actionItems: '',
    nextFollowUp: '',
    meetingLink: '',
    documentLinks: '',
  }

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reads the entered time in the viewer’s timezone', () => {
    vi.stubEnv('TZ', 'Australia/Melbourne')
    // 10am on 20 October in Melbourne (UTC+11) is 11pm on the 19th in UTC.
    expect(toLogActivityInput(values).occurredAt).toBe('2026-10-19T23:00:00.000Z')
  })

  it('sends a value the server accepts', () => {
    const input = toLogActivityInput(values)
    expect(logActivitySchema.safeParse(input).success).toBe(true)
  })
})
