import { z } from 'zod'

/**
 * Organisation & stakeholder schema — Epic 1.
 *
 * Field list confirmed by the BA (18 Sep). Relationship status is kept separate
 * from pipeline stage, and its values are intentionally not hard-coded — the BRD
 * does not define a fixed list yet.
 *
 * Contacts are embedded on the organisation document rather than stored in a
 * subcollection: Epic 1 only ever displays them inside an organisation profile,
 * so a subcollection would add reads without adding value.
 *
 * Timestamps are ISO 8601 strings so the whole document is Zod-validatable and
 * the routes never import firebase-admin directly (enforced by the conventions test).
 */

export const PIPELINE_STAGES = [
  'Prospect',
  'Research',
  'Qualified',
  'Outreach',
  'Follow-up',
  'Meeting',
  'Proposal',
  'Negotiation',
  'Partnership',
  'Active Relationship',
  'Completed',
  'Archived',
] as const

export const ORGANISATION_TYPES = ['Industry Partner', 'Client', 'Collaborator'] as const

export const contactSchema = z.object({
  name: z.string().min(1),
  role: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  isPrimary: z.boolean(),
})

/** The full stored document. */
export const organisationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(ORGANISATION_TYPES),
  industry: z.string().nullable(),
  country: z.string().nullable(),
  website: z.string().url().nullable(),
  relationshipOwner: z.string().min(1),
  relationshipStatus: z.string().nullable(),
  pipelineStage: z.enum(PIPELINE_STAGES),
  tags: z.array(z.string()),
  notes: z.string().nullable(),
  contacts: z.array(contactSchema),
  createdAt: z.string().datetime(),
  createdBy: z.string().min(1),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
  _schemaVersion: z.literal(1),
})

/** Payload accepted by POST /api/organisations. */
export const createOrganisationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(ORGANISATION_TYPES),
  relationshipOwner: z.string().min(1),
  relationshipStatus: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  pipelineStage: z.enum(PIPELINE_STAGES).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
  contacts: z.array(contactSchema).optional(),
})

/** Payload accepted by PATCH /api/organisations/:id — every field optional. */
export const updateOrganisationSchema = z
  .object({
    name: z.string().min(1).optional(),
    type: z.enum(ORGANISATION_TYPES).optional(),
    relationshipOwner: z.string().min(1).optional(),
    relationshipStatus: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    website: z.string().url().nullable().optional(),
    pipelineStage: z.enum(PIPELINE_STAGES).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().nullable().optional(),
    contacts: z.array(contactSchema).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export type Organisation = z.infer<typeof organisationSchema>
export type Contact = z.infer<typeof contactSchema>
export type CreateOrganisationInput = z.infer<typeof createOrganisationSchema>
export type UpdateOrganisationInput = z.infer<typeof updateOrganisationSchema>
