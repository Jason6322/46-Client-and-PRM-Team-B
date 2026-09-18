/**
 * Organisation enums.
 *
 * Source of truth for the frontend. The pipeline stages are taken from the
 * "Relationships by Pipeline Stage" chart on screen 1 of the approved
 * prototype, in the order the chart lists them.
 */

export const ORGANISATION_TYPES = ['Industry Partner', 'Client', 'Collaborator'] as const

export type OrganisationType = (typeof ORGANISATION_TYPES)[number]

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

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

/** Stage assigned to every newly created organisation. */
export const DEFAULT_PIPELINE_STAGE: PipelineStage = 'Prospect'
