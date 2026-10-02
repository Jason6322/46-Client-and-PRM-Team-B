import { z } from 'zod'

//org and stakeholder schema for epic 1

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

//stores contacts within org record since theyre only required for profile

export const contactSchema = z.object({
  name: z.string().min(1),
  role: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  isPrimary: z.boolean(),
})

//stores relationship info - research, lead score and next steps with 1 record per org

export const relationshipSchema = z.object({
  researchInfo: z.string().nullable(),
  researchStatus: z.string().nullable(),
  businessBrief: z.string().nullable(),
  qualificationInfo: z.string().nullable(),
  leadScore: z.number().int().min(0).max(100).nullable(),
  outreachStatus: z.string().nullable(),
  communicationRecord: z.string().nullable(),
  followUpStatus: z.string().nullable(),
  nextAction: z.string().nullable(),
  nextActionDueAt: z.string().datetime().nullable(),
  relationshipNotes: z.string().nullable(),
})

//records each time an org moves pipeline stage, history is append only

export const stageMoveSchema = z.object({
  fromStage: z.enum(PIPELINE_STAGES).nullable(),
  toStage: z.enum(PIPELINE_STAGES),
  changedBy: z.string().min(1),
  changedAt: z.string().datetime(),
  assignedOwner: z.string().nullable(),
  note: z.string().nullable(),
  nextAction: z.string().nullable(),
})

//represents full doc in it's firestore represntation

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
  relationship: relationshipSchema,
  stageHistory: z.array(stageMoveSchema),
  createdAt: z.string().datetime(),
  createdBy: z.string().min(1),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
  _schemaVersion: z.literal(1),
})

//defines fields accepted when a new org is created

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
  relationship: relationshipSchema.partial().optional(),
})

//defines fields accepted when updating org, all are optional atleast 1 is required

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
    relationship: relationshipSchema.partial().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

//payload for moving an org to a different pipeline stage

export const changeStageSchema = z.object({
  toStage: z.enum(PIPELINE_STAGES),
  assignedOwner: z.string().min(1).optional(),
  note: z.string().nullable().optional(),
  nextAction: z.string().nullable().optional(),
})

export type Organisation = z.infer<typeof organisationSchema>
export type Contact = z.infer<typeof contactSchema>
export type Relationship = z.infer<typeof relationshipSchema>
export type StageTransition = z.infer<typeof stageMoveSchema>
export type CreateOrganisationInput = z.infer<typeof createOrganisationSchema>
export type UpdateOrganisationInput = z.infer<typeof updateOrganisationSchema>
export type MoveStageInput = z.infer<typeof changeStageSchema>

//empty relationship used when a new org is created

export const BLANK_RELATIONSHIP: Relationship = {
  researchInfo: null,
  researchStatus: null,
  businessBrief: null,
  qualificationInfo: null,
  leadScore: null,
  outreachStatus: null,
  communicationRecord: null,
  followUpStatus: null,
  nextAction: null,
  nextActionDueAt: null,
  relationshipNotes: null,
}