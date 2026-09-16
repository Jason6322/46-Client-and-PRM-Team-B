import { Router, type Router as ExpressRouter } from 'express'
import { adminDb } from '../lib/firebase'
import { HttpError } from '../lib/errors'
import { createZodConverter } from '../lib/zodConverter'
import type { AuthenticatedRequest } from '../middleware/auth'
import {
  organisationSchema,
  createOrganisationSchema,
  updateOrganisationSchema,
  type Organisation,
} from '../schemas/organisation'
import type { ZodError } from 'zod'

const COLLECTION = 'organisations'
const SCHEMA_VERSION = 1

const converter = createZodConverter(organisationSchema, SCHEMA_VERSION)

/** Typed handle on the organisations collection. */
function organisations() {
  return adminDb.collection(COLLECTION).withConverter(converter)
}

/** Flattens a Zod error into a single readable detail string. */
function describe(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
}

const router: ExpressRouter = Router()

/**
 * POST /api/organisations
 * Creates an organisation. Responds 201 with the created record.
 */
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
      industry: input.industry ?? null,
      country: input.country ?? null,
      website: input.website ?? null,
      pipelineStage: input.pipelineStage ?? 'Prospect',
      tags: input.tags ?? [],
      notes: input.notes ?? null,
      contacts: input.contacts ?? [],
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

/**
 * GET /api/organisations
 * Lists every organisation that has not been archived.
 */
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

/**
 * GET /api/organisations/:id
 * Returns a single organisation. Archived records are treated as not found.
 */
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

/**
 * PATCH /api/organisations/:id
 * Applies a partial update. The merged document is re-validated before it is
 * written, so a bad patch can never leave a malformed record in Firestore.
 */
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

/**
 * POST /api/organisations/:id/archive
 * Soft-deletes an organisation by stamping deletedAt. Nothing is ever hard
 * deleted, so the record stays available for reporting and audit.
 */
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
