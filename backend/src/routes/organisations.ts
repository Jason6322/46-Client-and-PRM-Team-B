import { Router, type Router as ExpressRouter } from 'express'
import { adminDb } from '../lib/firebase'
import { HttpError } from '../lib/errors'
import { createZodConverter } from '../lib/zodConverter'
import type { AuthenticatedRequest } from '../middleware/auth'
import {
  organisationSchema,
  createOrganisationSchema,
  updateOrganisationSchema,
  EMPTY_RELATIONSHIP,
  type Organisation,
} from '../schemas/organisation'
import type { ZodError } from 'zod'

const COLLECTION = 'organisations'
const SCHEMA_VERSION = 1

const converter = createZodConverter(organisationSchema, SCHEMA_VERSION)

function organisations() {
  return adminDb.collection(COLLECTION).withConverter(converter)
}

//turns a zod error into one readable line for the response

function describe(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
}

const router: ExpressRouter = Router()

//POST /api/organisations - create an organisation

router.post('/', async (req, res, next) => {
  const parsed = createOrganisationSchema.safeParse(req.body)
  if (!parsed.success) {
    next(HttpError.badRequest(describe(parsed.error)))
    return
  }

  try {
    const { user } = req as AuthenticatedRequest
    const now = new Date().toISOString()
    const input = parsed.data

    const organisation: Organisation = {
      name: input.name,
      type: input.type,
      relationshipOwner: input.relationshipOwner,
      relationshipStatus: input.relationshipStatus ?? null,
      industry: input.industry ?? null,
      country: input.country ?? null,
      website: input.website ?? null,
      pipelineStage: input.pipelineStage ?? 'Prospect',
      tags: input.tags ?? [],
      notes: input.notes ?? null,
      contacts: input.contacts ?? [],
      relationship: { ...EMPTY_RELATIONSHIP, ...(input.relationship ?? {}) },
      createdAt: now,
      createdBy: user.uid,
      updatedAt: now,
      deletedAt: null,
      _schemaVersion: SCHEMA_VERSION,
    }

    const ref = await organisations().add(organisation)
    res.status(201).json({ id: ref.id, ...organisation })
  } catch (error) {
    next(error)
  }
})

//GET /api/organisations - list everything not archived

router.get('/', async (_req, res, next) => {
  try {
    const snapshot = await organisations().where('deletedAt', '==', null).get()
    res.json({
      organisations: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    })
  } catch (error) {
    next(error)
  }
})

//GET /api/organisations/:id - archived records count as not found

router.get('/:id', async (req, res, next) => {
  const id = req.params['id']
  if (!id) {
    next(HttpError.badRequest('id is required'))
    return
  }

  try {
    const doc = await organisations().doc(id).get()
    const data = doc.data()
    if (!data || data.deletedAt !== null) {
      next(HttpError.notFound('Organisation', id))
      return
    }
    res.json({ id: doc.id, ...data })
  } catch (error) {
    next(error)
  }
})

//PATCH /api/organisations/:id - partial update, revalidated before saving

router.patch('/:id', async (req, res, next) => {
  const id = req.params['id']
  if (!id) {
    next(HttpError.badRequest('id is required'))
    return
  }

  const parsed = updateOrganisationSchema.safeParse(req.body)
  if (!parsed.success) {
    next(HttpError.badRequest(describe(parsed.error)))
    return
  }

  try {
    const ref = organisations().doc(id)
    const existing = (await ref.get()).data()
    if (!existing || existing.deletedAt !== null) {
      next(HttpError.notFound('Organisation', id))
      return
    }

    const updated: Organisation = {
      ...existing,
      ...parsed.data,
      //merged separately so updating one relationship field doesnt wipe the rest
      relationship: { ...existing.relationship, ...(parsed.data.relationship ?? {}) },
      updatedAt: new Date().toISOString(),
    }

    const validated = organisationSchema.safeParse(updated)
    if (!validated.success) {
      next(HttpError.badRequest(describe(validated.error)))
      return
    }

    await ref.set(validated.data)
    res.json({ id, ...validated.data })
  } catch (error) {
    next(error)
  }
})

//POST /api/organisations/:id/archive - soft delete, nothing is ever removed

router.post('/:id/archive', async (req, res, next) => {
  const id = req.params['id']
  if (!id) {
    next(HttpError.badRequest('id is required'))
    return
  }

  try {
    const ref = organisations().doc(id)
    const existing = (await ref.get()).data()
    if (!existing) {
      next(HttpError.notFound('Organisation', id))
      return
    }
    if (existing.deletedAt !== null) {
      next(HttpError.conflict('Organisation is already archived'))
      return
    }

    const now = new Date().toISOString()
    const archived: Organisation = { ...existing, deletedAt: now, updatedAt: now }

    await ref.set(archived)
    res.json({ id, ...archived })
  } catch (error) {
    next(error)
  }
})

export { router as organisationsRouter }
