import { z } from 'zod'
import { OPPORTUNITY_TYPES } from '@/features/opportunities/constants'
import { PIPELINE_STAGES, DEFAULT_PIPELINE_STAGE } from '@/features/organisations/constants'

/**
 * Opportunity validation.
 *
 * Same split as organisations: a storage schema that speaks nulls, and a
 * form schema that speaks the strings an HTML input produces.
 */

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()

/** http/https only — a stored javascript: link becomes XSS once rendered. */
const webUrl = z
  .string()
  .trim()
  .url('Enter a valid link')
  .refine((value) => /^https?:\/\//i.test(value), 'Links must start with http:// or https://')

export const createOpportunitySchema = z.object({
  name: z.string().trim().min(1, 'Opportunity name is required').max(200),
  organisationId: z.string().trim().min(1, 'Choose an organisation'),
  type: z.enum(OPPORTUNITY_TYPES, { message: 'Select a type' }),
  stage: z.enum(PIPELINE_STAGES).default(DEFAULT_PIPELINE_STAGE),
  owner: z.string().trim().min(1, 'Assigned team member is required').max(100),
  nextStep: optionalText,
  proposalDocument: webUrl.nullable().or(z.literal('').transform(() => null)),
  description: optionalText,
  expectedOutcome: optionalText,
})

export const updateOpportunitySchema = createOpportunitySchema.partial().omit({
  // The organisation an opportunity belongs to is fixed once created; moving
  // it would silently detach it from its contacts and activity history.
  organisationId: true,
})

export const opportunityFormSchema = z.object({
  name: z.string().trim().min(1, 'Opportunity name is required').max(200),
  organisationId: z.string().min(1, 'Choose an organisation'),
  type: z.enum(OPPORTUNITY_TYPES, { message: 'Select a type' }),
  stage: z.enum(PIPELINE_STAGES),
  owner: z.string().trim().min(1, 'Assigned team member is required').max(100),
  nextStep: z.string().trim().max(300),
  proposalDocument: z.union([webUrl, z.literal('')]),
  description: z.string().trim().max(2000),
  expectedOutcome: z.string().trim().max(1000),
})

export type OpportunityFormValues = z.infer<typeof opportunityFormSchema>

const emptyToNull = (value: string) => (value.trim().length > 0 ? value.trim() : null)

export function toOpportunityInput(values: OpportunityFormValues) {
  return {
    name: values.name.trim(),
    organisationId: values.organisationId,
    type: values.type,
    stage: values.stage,
    owner: values.owner.trim(),
    nextStep: emptyToNull(values.nextStep),
    proposalDocument: emptyToNull(values.proposalDocument),
    description: emptyToNull(values.description),
    expectedOutcome: emptyToNull(values.expectedOutcome),
  }
}

/** Stored opportunity → form values for the detail panel. */
export function toOpportunityFormValues(opportunity: {
  name: string
  organisationId: string
  type: OpportunityFormValues['type']
  stage: OpportunityFormValues['stage']
  owner: string
  nextStep: string | null
  proposalDocument: string | null
  description: string | null
  expectedOutcome: string | null
}): OpportunityFormValues {
  return {
    name: opportunity.name,
    organisationId: opportunity.organisationId,
    type: opportunity.type,
    stage: opportunity.stage,
    owner: opportunity.owner,
    nextStep: opportunity.nextStep ?? '',
    proposalDocument: opportunity.proposalDocument ?? '',
    description: opportunity.description ?? '',
    expectedOutcome: opportunity.expectedOutcome ?? '',
  }
}
