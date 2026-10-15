import { beforeEach, describe, expect, it, vi } from 'vitest'

const add = vi.fn()
const profiles: Record<string, Record<string, unknown>> = {
  u1: { displayName: 'Jason', email: 'jason@example.org' },
  u2: { displayName: '', email: 'saneli@example.org' },
}

vi.mock('@/actions/auth.actions', () => ({
  requireAuth: vi.fn().mockResolvedValue({ uid: 'u1' }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => ({
      doc: (id: string) => ({
        id,
        get: async () =>
          name === 'organisations'
            ? { exists: true, data: () => ({ name: 'Acme Ltd', deletedAt: null }) }
            : undefined,
      }),
      add,
    }),
    getAll: async (...refs: { id: string }[]) =>
      refs.map(({ id }) => ({ id, exists: id in profiles, data: () => profiles[id] })),
  },
}))

const { createOpportunity } = await import('@/features/opportunities/actions/opportunities.actions')

const input = {
  name: 'School Garden Partnership',
  organisationId: 'org-1',
  type: 'Partnership',
  stage: 'Prospect',
  nextStep: null,
  proposalDocument: null,
  description: null,
  expectedOutcome: null,
}

describe('createOpportunity assigned team members', () => {
  beforeEach(() => {
    add.mockReset()
    add.mockResolvedValue({ id: 'opp-1' })
  })

  it('stores each member with the name from their profile', async () => {
    const result = await createOpportunity({ ...input, assignedTo: ['u1', 'u2', 'u1'] })

    expect(result.success).toBe(true)
    expect(add.mock.calls[0]?.[0].assignedTo).toEqual([
      { uid: 'u1', name: 'Jason' },
      // No display name, so the email stands in.
      { uid: 'u2', name: 'saneli@example.org' },
    ])
  })

  it('refuses a uid with no profile rather than storing it', async () => {
    const result = await createOpportunity({ ...input, assignedTo: ['u1', 'forged'] })

    expect(result.success).toBe(false)
    expect(add).not.toHaveBeenCalled()
  })

  it('requires at least one member', async () => {
    const result = await createOpportunity({ ...input, assignedTo: [] })

    expect(result).toEqual({ success: false, error: 'Assign at least one team member' })
  })
})
