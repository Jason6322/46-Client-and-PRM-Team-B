import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../src/app'
import { mockVerifyToken, mockUser } from '../../setup'
import { adminDb } from '../../../src/lib/firebase'
import type { Organisation } from '../../../src/schemas/organisation'

const app = createApp({ verifyToken: mockVerifyToken })
const TOKEN = 'Bearer test-token'

/** Sample record modelled on the GreenLeaf Foods row from the prototype. */
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
  createdAt: '2026-09-16T00:00:00.000Z',
  createdBy: 'test-uid',
  updatedAt: '2026-09-16T00:00:00.000Z',
  deletedAt: null,
  _schemaVersion: 1,
}

/** Points adminDb.collection() at an in-memory stand-in for Firestore. */
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
    expect(collection.add).toHaveBeenCalledOnce()
  }, 20000)

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

describe('POST /api/organisations/:id/archive', () => {
  it('soft deletes by stamping deletedAt', async () => {
    const { docRef } = mockFirestore(sampleOrganisation)

    const res = await request(app)
      .post('/api/organisations/org-1/archive')
      .set('Authorization', TOKEN)

    expect(res.status).toBe(200)
    expect(res.body.deletedAt).not.toBeNull()
    expect(docRef.set).toHaveBeenCalledOnce()
  })

  it('returns 409 when already archived', async () => {
    mockFirestore({ ...sampleOrganisation, deletedAt: '2026-09-16T01:00:00.000Z' })

    const res = await request(app)
      .post('/api/organisations/org-1/archive')
      .set('Authorization', TOKEN)

    expect(res.status).toBe(409)
  })
})
