import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../src/app'
import { mockVerifyToken, mockUser } from '../../setup'
import { adminDb } from '../../../src/lib/firebase'
import type { Organisation } from '../../../src/schemas/organisation'

const app = createApp({ verifyToken: mockVerifyToken })
const TOKEN = 'Bearer test-token'

//sample data representing the greenleaf foods row

const sampleOrganisation: Organisation = {
  name: 'GreenLeaf Foods',
  type: 'Industry Partner',
  relationshipOwner: 'D. Zytsel',
  industry: 'Food Distribution',
  country: 'Australia',
  website: 'https://www.greenleaffoods.com.au',
  relationshipStatus: 'Active',
  pipelineStage: 'Negotiation',
  tags: ['priority', 'food'],
  notes: 'Prefers email over calls.',
  contacts: [
    {
      name: 'J. Alvarez',
      role: 'Operations Manager',
      email: 'j.alvarez@greenleaffoods.com.au',
      phone: null,
      isPrimary: true,
    },
  ],
  relationship: {
    researchInfo: 'Met at the food systems expo, interested in a 12 month partnership.',
    researchStatus: 'Complete',
    businessBrief: 'Food distributor looking to expand community fridge partnerships.',
    qualificationInfo: 'Budget confirmed, decision maker engaged.',
    leadScore: 82,
    outreachStatus: 'Awaiting contract review',
    communicationRecord: 'Call logged 2 Sep, site visit 5 Sep.',
    followUpStatus: 'Scheduled',
    nextAction: 'Send revised partnership contract',
    nextActionDueAt: '2026-09-02T00:00:00.000Z',
    relationshipNotes: 'Prefers written updates over calls.',
  },
  stageHistory: [],
  
  createdAt: '2026-09-16T00:00:00.000Z',
  createdBy: 'test-uid',
  updatedAt: '2026-09-16T00:00:00.000Z',
  deletedAt: null,
  _schemaVersion: 1,
}

//provides a mock firestore setup to keep away from the actual db

function mockFirestore(stored: Organisation | null) {
  const docRef = {
    get: vi.fn().mockResolvedValue({ id: 'org-1', data: () => stored ?? undefined }),
    set: vi.fn().mockResolvedValue(undefined),
  }
  const collection = {
    add: vi.fn().mockResolvedValue({ id: 'org-1' }),
    doc: vi.fn().mockReturnValue(docRef),
    where: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({
        docs: stored ? [{ id: 'org-1', data: () => stored }] : [],
      }),
    }),
  }
  vi.mocked(adminDb.collection).mockReturnValue({
    withConverter: vi.fn().mockReturnValue(collection),
  } as unknown as ReturnType<typeof adminDb.collection>)
  return { collection, docRef }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(mockVerifyToken).mockResolvedValue(mockUser)
})

describe('POST /api/organisations', () => {
  it('creates an organisation and applies defaults', async () => {
    const { collection } = mockFirestore(null)

    const res = await request(app).post('/api/organisations').set('Authorization', TOKEN).send({
      name: 'Riverbend Co-op',
      type: 'Client',
      relationshipOwner: 'T. Ngo',
    })

    expect(res.status).toBe(201)
    expect(res.body.id).toBe('org-1')
    expect(res.body.pipelineStage).toBe('Prospect')
    expect(res.body.tags).toEqual([])
    expect(res.body.deletedAt).toBeNull()
    expect(res.body.createdBy).toBe('test-uid')
    expect(res.body.relationship.leadScore).toBeNull()
    expect(res.body.relationship.nextAction).toBeNull()
    expect(collection.add).toHaveBeenCalledOnce()
  }, //first test carries the startup cost so it gets a longer timeout
  20000)

  it('rejects a payload missing required fields', async () => {
    mockFirestore(null)

    const res = await request(app)
      .post('/api/organisations')
      .set('Authorization', TOKEN)
      .send({ type: 'Client' })

    expect(res.status).toBe(400)
  })

  it('rejects an unknown pipeline stage', async () => {
    mockFirestore(null)

    const res = await request(app).post('/api/organisations').set('Authorization', TOKEN).send({
      name: 'Harvest Moon Co.',
      type: 'Client',
      relationshipOwner: 'J. Xu',
      pipelineStage: 'Not A Real Stage',
    })

    expect(res.status).toBe(400)
  })

  it('requires authentication', async () => {
    mockFirestore(null)
    vi.mocked(mockVerifyToken).mockRejectedValueOnce(new Error('no token'))

    const res = await request(app)
      .post('/api/organisations')
      .set('Authorization', TOKEN)
      .send({ name: 'X' })

    expect(res.status).toBe(401)
  })
})

describe('GET /api/organisations', () => {
  it('returns stored organisations including tags and notes', async () => {
    mockFirestore(sampleOrganisation)

    const res = await request(app).get('/api/organisations').set('Authorization', TOKEN)

    expect(res.status).toBe(200)
    expect(res.body.organisations).toHaveLength(1)
    expect(res.body.organisations[0].tags).toEqual(['priority', 'food'])
    expect(res.body.organisations[0].notes).toBe('Prefers email over calls.')
  })
})

describe('GET /api/organisations/:id', () => {
  it('returns a single organisation', async () => {
    mockFirestore(sampleOrganisation)

    const res = await request(app).get('/api/organisations/org-1').set('Authorization', TOKEN)

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('GreenLeaf Foods')
    expect(res.body.contacts[0].isPrimary).toBe(true)
  })

  it('returns 404 when the organisation is archived', async () => {
    mockFirestore({ ...sampleOrganisation, deletedAt: '2026-09-16T01:00:00.000Z' })

    const res = await request(app).get('/api/organisations/org-1').set('Authorization', TOKEN)

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/organisations/:id', () => {
  it('updates tags and notes', async () => {
    const { docRef } = mockFirestore(sampleOrganisation)

    const res = await request(app)
      .patch('/api/organisations/org-1')
      .set('Authorization', TOKEN)
      .send({ tags: ['priority'], notes: 'Moved to contract review.' })

    expect(res.status).toBe(200)
    expect(res.body.tags).toEqual(['priority'])
    expect(res.body.notes).toBe('Moved to contract review.')
    expect(res.body.name).toBe('GreenLeaf Foods')
    expect(docRef.set).toHaveBeenCalledOnce()
  })

  it('rejects an empty patch', async () => {
    mockFirestore(sampleOrganisation)

    const res = await request(app)
      .patch('/api/organisations/org-1')
      .set('Authorization', TOKEN)
      .send({})

    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/organisations/:id - relationship fields', () => {
  //confirms that updating 1 field doesnt change values of the other fields

  it('updates the lead score without wiping the other fields', async () => {
    const { docRef } = mockFirestore(sampleOrganisation)

    const res = await request(app)
      .patch('/api/organisations/org-1')
      .set('Authorization', TOKEN)
      .send({ relationship: { leadScore: 90 } })

    expect(res.status).toBe(200)
    expect(res.body.relationship.leadScore).toBe(90)
    expect(res.body.relationship.nextAction).toBe('Send revised partnership contract')
    expect(docRef.set).toHaveBeenCalledOnce()
  })

  it('records a follow up next action', async () => {
    mockFirestore(sampleOrganisation)

    const res = await request(app)
      .patch('/api/organisations/org-1')
      .set('Authorization', TOKEN)
      .send({
        relationship: {
          nextAction: 'Schedule site visit',
          nextActionDueAt: '2026-10-01T00:00:00.000Z',
        },
      })

    expect(res.status).toBe(200)
    expect(res.body.relationship.nextAction).toBe('Schedule site visit')
    expect(res.body.relationship.nextActionDueAt).toBe('2026-10-01T00:00:00.000Z')
  })

  it('stores qualification info alongside the lead score', async () => {
    mockFirestore(sampleOrganisation)

    const res = await request(app)
      .patch('/api/organisations/org-1')
      .set('Authorization', TOKEN)
      .send({
        relationship: {
          leadScore: 75,
          qualificationInfo: 'Budget reduced, timeline pushed to Q2.',
        },
      })

    expect(res.status).toBe(200)
    expect(res.body.relationship.leadScore).toBe(75)
    expect(res.body.relationship.qualificationInfo).toBe('Budget reduced, timeline pushed to Q2.')
  })

  it('rejects a lead score above 100', async () => {
    mockFirestore(sampleOrganisation)

    const res = await request(app)
      .patch('/api/organisations/org-1')
      .set('Authorization', TOKEN)
      .send({ relationship: { leadScore: 150 } })

    expect(res.status).toBe(400)
  })
})
describe('POST /api/organisations/:id/stage', () => {
  it('moves the organisation to a new stage and records the transition', async () => {
    const { docRef } = mockFirestore(sampleOrganisation)

    const res = await request(app)
      .post('/api/organisations/org-1/stage')
      .set('Authorization', TOKEN)
      .send({ toStage: 'Partnership', note: 'Contract signed.' })

    expect(res.status).toBe(200)
    expect(res.body.pipelineStage).toBe('Partnership')
    expect(res.body.stageHistory).toHaveLength(1)
    expect(res.body.stageHistory[0].fromStage).toBe('Negotiation')
    expect(res.body.stageHistory[0].toStage).toBe('Partnership')
    expect(res.body.stageHistory[0].note).toBe('Contract signed.')
    expect(res.body.stageHistory[0].changedBy).toBe('test-uid')
    expect(docRef.set).toHaveBeenCalledOnce()
  })

  it('assigns an owner and next action on the transition', async () => {
    mockFirestore(sampleOrganisation)

    const res = await request(app)
      .post('/api/organisations/org-1/stage')
      .set('Authorization', TOKEN)
      .send({
        toStage: 'Proposal',
        assignedOwner: 'T. Ngo',
        nextAction: 'Draft the proposal document',
      })

    expect(res.status).toBe(200)
    expect(res.body.relationshipOwner).toBe('T. Ngo')
    expect(res.body.stageHistory[0].assignedOwner).toBe('T. Ngo')
    expect(res.body.stageHistory[0].nextAction).toBe('Draft the proposal document')
  })

  //history is append only so earlier transitions must survive a later move

  it('keeps earlier transitions when moving again', async () => {
    mockFirestore({
      ...sampleOrganisation,
      stageHistory: [
        {
          fromStage: 'Proposal',
          toStage: 'Negotiation',
          changedBy: 'test-uid',
          changedAt: '2026-09-20T00:00:00.000Z',
          assignedOwner: 'D. Zytsel',
          note: 'Client asked to renegotiate terms.',
          nextAction: null,
        },
      ],
    })

    const res = await request(app)
      .post('/api/organisations/org-1/stage')
      .set('Authorization', TOKEN)
      .send({ toStage: 'Partnership' })

    expect(res.status).toBe(200)
    expect(res.body.stageHistory).toHaveLength(2)
    expect(res.body.stageHistory[0].toStage).toBe('Negotiation')
    expect(res.body.stageHistory[1].toStage).toBe('Partnership')
  })

  it('rejects a stage that is not one of the 12', async () => {
    mockFirestore(sampleOrganisation)

    const res = await request(app)
      .post('/api/organisations/org-1/stage')
      .set('Authorization', TOKEN)
      .send({ toStage: 'Made Up Stage' })

    expect(res.status).toBe(400)
  })

  it('returns 409 when already at that stage', async () => {
    mockFirestore(sampleOrganisation)

    const res = await request(app)
      .post('/api/organisations/org-1/stage')
      .set('Authorization', TOKEN)
      .send({ toStage: 'Negotiation' })

    expect(res.status).toBe(409)
  })

  it('returns 404 when the organisation is archived', async () => {
    mockFirestore({ ...sampleOrganisation, deletedAt: '2026-09-16T01:00:00.000Z' })

    const res = await request(app)
      .post('/api/organisations/org-1/stage')
      .set('Authorization', TOKEN)
      .send({ toStage: 'Partnership' })

    expect(res.status).toBe(404)
  })
})