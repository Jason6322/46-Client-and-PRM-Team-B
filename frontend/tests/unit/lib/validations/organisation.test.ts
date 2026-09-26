import { describe, expect, it } from 'vitest'
import { organisationFormSchema, updateOrganisationSchema } from '@/lib/validations/organisation'

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
