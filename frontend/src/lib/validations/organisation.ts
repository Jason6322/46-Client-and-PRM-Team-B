import { z } from 'zod'
import {
  DEFAULT_PIPELINE_STAGE,
  ORGANISATION_TYPES,
  PIPELINE_STAGES,
  RELATIONSHIP_STATUSES,
} from '@/features/organisations/constants'
import { isDateOnly, millisToDateOnly } from '@/features/organisations/followUp'

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

/** A calendar date from a date input ("2026-09-02"), or null for none. */
const dueDate = z
  .string()
  .refine(isDateOnly, 'Enter a valid date')
  .nullable()
  .or(z.literal('').transform(() => null))

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
  pipelineStage: z.enum(PIPELINE_STAGES).default(DEFAULT_PIPELINE_STAGE),
  relationshipStatus: z
    .enum(RELATIONSHIP_STATUSES, { message: 'Select a relationship status' })
    .nullable()
    .or(z.literal('').transform(() => null))
    .default(null),
  primaryContact: organisationContactSchema,
  secondaryContact: organisationContactSchema.nullable().default(null),
  notes: optionalText,
  nextAction: optionalText.default(null),
  nextActionDueAt: dueDate.default(null),
})

export const updateOrganisationSchema = createOrganisationSchema.partial()

/**
 * The follow-up on its own, for the inline editor on the profile.
 * A due date with nothing to do is meaningless, so it needs an action.
 */
export const nextActionSchema = z
  .object({
    nextAction: optionalText,
    nextActionDueAt: dueDate,
  })
  .refine((value) => value.nextActionDueAt === null || value.nextAction !== null, {
    message: 'Add the follow-up before setting a due date',
    path: ['nextAction'],
  })

/**
 * Relationship management — the Relationships screen.
 *
 * Every field is optional: the screen is filled in gradually as an
 * organisation is researched, contacted and qualified.
 */
export const relationshipManagementSchema = z.object({
  businessResearchNotes: optionalText,
  qualificationInfo: optionalText,
  leadScore: z
    .number()
    .int('Lead score must be a whole number')
    .min(0, 'Lead score must be between 0 and 100')
    .max(100, 'Lead score must be between 0 and 100')
    .nullable(),
  researchStatus: optionalText,
  businessBrief: optionalText,
  outreachStatus: optionalText,
  communicationRecord: optionalText,
  followUpStatus: optionalText,
  relationshipNotes: optionalText,
  // Shared with the profile rather than duplicated.
  relationshipOwner: z.string().trim().min(1, 'Assigned team member is required').max(100),
  nextAction: optionalText,
})

/** Form-shaped counterpart — inputs produce strings, including the lead score. */
export const relationshipManagementFormSchema = z.object({
  businessResearchNotes: z.string().trim().max(2000),
  qualificationInfo: z.string().trim().max(2000),
  leadScore: z.union([
    z.literal(''),
    z
      .string()
      .regex(/^\d{1,3}$/, 'Enter a number from 0 to 100')
      .refine((value) => Number(value) <= 100, 'Enter a number from 0 to 100'),
  ]),
  researchStatus: z.string().trim().max(100),
  businessBrief: z.string().trim().max(500),
  outreachStatus: z.string().trim().max(200),
  communicationRecord: z.string().trim().max(2000),
  followUpStatus: z.string().trim().max(200),
  relationshipNotes: z.string().trim().max(2000),
  relationshipOwner: z.string().trim().min(1, 'Assigned team member is required').max(100),
  nextAction: z.string().trim().max(300),
})

export type RelationshipManagementFormValues = z.infer<typeof relationshipManagementFormSchema>

/** Convert the relationship form's values into the Server Action payload. */
export function toRelationshipManagementInput(values: RelationshipManagementFormValues) {
  return {
    businessResearchNotes: emptyToNull(values.businessResearchNotes),
    qualificationInfo: emptyToNull(values.qualificationInfo),
    leadScore: values.leadScore === '' ? null : Number(values.leadScore),
    researchStatus: emptyToNull(values.researchStatus),
    businessBrief: emptyToNull(values.businessBrief),
    outreachStatus: emptyToNull(values.outreachStatus),
    communicationRecord: emptyToNull(values.communicationRecord),
    followUpStatus: emptyToNull(values.followUpStatus),
    relationshipNotes: emptyToNull(values.relationshipNotes),
    relationshipOwner: values.relationshipOwner.trim(),
    nextAction: emptyToNull(values.nextAction),
  }
}

/** Standalone stage validation, for the stage control on the detail screen. */
export const pipelineStageSchema = z.enum(PIPELINE_STAGES, { message: 'Unknown pipeline stage' })

export type CreateOrganisationValues = z.input<typeof createOrganisationSchema>
export type UpdateOrganisationValues = z.input<typeof updateOrganisationSchema>

/**
 * Form-shaped schema for the Add Organisation screen.
 *
 * HTML inputs always produce strings, never null, so the form validates
 * against this and `toCreateOrganisationInput` converts the result into the
 * stored shape. Keeping the two separate is what lets the form show "" for an
 * untouched optional field while Firestore stores null.
 */

const contactFormSchema = z.object({
  name: z.string().trim().min(1, 'Contact name is required'),
  role: z.string().trim(),
  email: z.union([z.string().trim().email('Enter a valid email'), z.literal('')]),
  phone: z.string().trim(),
})

export const organisationFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Organisation name is required').max(200),
    type: z.enum(ORGANISATION_TYPES, { message: 'Select a type' }),
    industry: z.string().trim(),
    country: z.string().trim().min(1, 'Country is required').max(100),
    website: z.union([z.string().trim().url('Enter a valid URL'), z.literal('')]),
    relationshipOwner: z.string().trim().min(1, 'Relationship owner is required').max(100),
    relationshipStatus: z.union([z.enum(RELATIONSHIP_STATUSES), z.literal('')]),
    tags: z.string(),
    notes: z.string(),
    nextAction: z.string().trim().max(300),
    nextActionDueAt: z.union([z.string().refine(isDateOnly, 'Enter a valid date'), z.literal('')]),
    primaryContact: contactFormSchema,
    secondaryContact: contactFormSchema.optional(),
  })
  .refine((values) => values.nextActionDueAt === '' || values.nextAction.trim() !== '', {
    message: 'Add the follow-up before setting a due date',
    path: ['nextAction'],
  })

export type OrganisationFormValues = z.infer<typeof organisationFormSchema>

const emptyToNull = (value: string) => (value.trim().length > 0 ? value.trim() : null)

/** Convert validated form values into the payload the Server Action expects. */
export function toCreateOrganisationInput(values: OrganisationFormValues) {
  const contact = (input: z.infer<typeof contactFormSchema>) => ({
    name: input.name.trim(),
    role: emptyToNull(input.role),
    email: emptyToNull(input.email),
    phone: emptyToNull(input.phone),
  })

  return {
    name: values.name.trim(),
    type: values.type,
    industry: emptyToNull(values.industry),
    country: values.country.trim(),
    website: emptyToNull(values.website),
    relationshipOwner: values.relationshipOwner.trim(),
    relationshipStatus: values.relationshipStatus === '' ? null : values.relationshipStatus,
    tags: values.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    primaryContact: contact(values.primaryContact),
    secondaryContact: values.secondaryContact ? contact(values.secondaryContact) : null,
    notes: emptyToNull(values.notes),
    nextAction: emptyToNull(values.nextAction),
    nextActionDueAt: values.nextActionDueAt || null,
  }
}

/** Convert a stored organisation back into form values for the edit screen. */
export function toOrganisationFormValues(organisation: {
  name: string
  type: OrganisationFormValues['type']
  industry: string | null
  country: string
  website: string | null
  relationshipOwner: string
  relationshipStatus: OrganisationFormValues['relationshipStatus'] | null
  tags: string[]
  notes: string | null
  nextAction: string | null
  nextActionDueAt: number | null
  primaryContact: { name: string; role: string | null; email: string | null; phone: string | null }
  secondaryContact: {
    name: string
    role: string | null
    email: string | null
    phone: string | null
  } | null
}): OrganisationFormValues {
  const contact = (input: {
    name: string
    role: string | null
    email: string | null
    phone: string | null
  }) => ({
    name: input.name,
    role: input.role ?? '',
    email: input.email ?? '',
    phone: input.phone ?? '',
  })

  return {
    name: organisation.name,
    type: organisation.type,
    industry: organisation.industry ?? '',
    country: organisation.country,
    website: organisation.website ?? '',
    relationshipOwner: organisation.relationshipOwner,
    relationshipStatus: organisation.relationshipStatus ?? '',
    tags: organisation.tags.join(', '),
    notes: organisation.notes ?? '',
    nextAction: organisation.nextAction ?? '',
    nextActionDueAt:
      organisation.nextActionDueAt === null ? '' : millisToDateOnly(organisation.nextActionDueAt),
    primaryContact: contact(organisation.primaryContact),
    secondaryContact: organisation.secondaryContact
      ? contact(organisation.secondaryContact)
      : undefined,
  }
}
