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
 * Activity types logged by hand on the Meetings & Activities screen.
 *
 * Distinct from the automatic `stage_change` entries: these are interactions
 * someone records, those are written by the app when a stage moves.
 */
export const LOGGED_ACTIVITY_TYPES = ['Meeting', 'Call', 'Email', 'Note', 'Other'] as const

export type LoggedActivityType = (typeof LOGGED_ACTIVITY_TYPES)[number]

/** Badge colour per type, matching the wireframe's timeline. */
export const ACTIVITY_TYPE_CLASSES: Record<LoggedActivityType, string> = {
  Meeting: 'bg-brand-600 text-white',
  Call: 'bg-emerald-600 text-white',
  Email: 'bg-amber-500 text-white',
  Note: 'bg-orange-500 text-white',
  Other: 'bg-zinc-500 text-white',
}

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
