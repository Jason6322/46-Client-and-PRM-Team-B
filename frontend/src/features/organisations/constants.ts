/**
 * Organisation enums.
 *
 * Source of truth for the frontend. The pipeline stages are taken from the
 * "Relationships by Pipeline Stage" chart on screen 1 of the approved
 * prototype, in the order the chart lists them.
 */

export const ORGANISATION_TYPES = ['Industry Partner', 'Client', 'Collaborator'] as const

export type OrganisationType = (typeof ORGANISATION_TYPES)[number]

/**
 * Relationship status — the headline state, shown beside the pipeline stage
 * as "Negotiation · Active". Only these two appear in the approved wireframe.
 * The BRD has not settled the full list, so expect this to grow.
 */
export const RELATIONSHIP_STATUSES = ['Active', 'Prospect'] as const

export type RelationshipStatus = (typeof RELATIONSHIP_STATUSES)[number]

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

/**
 * The stage after this one, or null at the end of the list.
 * Backs "Save & Move to Next Stage" on the Relationships screen.
 */
export function nextPipelineStage(stage: PipelineStage): PipelineStage | null {
  const index = PIPELINE_STAGES.indexOf(stage)
  return PIPELINE_STAGES[index + 1] ?? null
}

/** Stage assigned to every newly created organisation. */
export const DEFAULT_PIPELINE_STAGE: PipelineStage = 'Prospect'
