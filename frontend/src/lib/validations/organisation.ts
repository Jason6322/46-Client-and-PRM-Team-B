import { z } from 'zod'
import { ORGANISATION_TYPES, PIPELINE_STAGES } from '@/features/organisations/constants'

/**
 * Organisation input validation.
 *
 * Mirrors the Add Organisation form on screen 5 of the approved prototype:
 * name, type, country, relationship owner and the primary contact's name are
 * the only required fields. Optional text fields normalise "" to null so the
 * Firestore document never holds empty strings.
 */

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()

export const organisationContactSchema = z.object({
  name: z.string().trim().min(1, 'Contact name is required'),
  role: optionalText,
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .nullable()
    .or(z.literal('').transform(() => null)),
  phone: optionalText,
})

export const createOrganisationSchema = z.object({
  name: z.string().trim().min(1, 'Organisation name is required').max(200),
  type: z.enum(ORGANISATION_TYPES),
  industry: optionalText,
  country: z.string().trim().min(1, 'Country is required').max(100),
  website: z
    .string()
    .trim()
    .url('Enter a valid URL')
    .nullable()
    .or(z.literal('').transform(() => null)),
  relationshipOwner: z.string().trim().min(1, 'Relationship owner is required').max(100),
  tags: z.array(z.string().trim().min(1)).max(20).default([]),
  pipelineStage: z.enum(PIPELINE_STAGES),
  primaryContact: organisationContactSchema,
  secondaryContact: organisationContactSchema.nullable().default(null),
  notes: optionalText,
})

export const updateOrganisationSchema = createOrganisationSchema.partial()

export type CreateOrganisationValues = z.input<typeof createOrganisationSchema>
export type UpdateOrganisationValues = z.input<typeof updateOrganisationSchema>
