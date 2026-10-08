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

/**
 * Lead priority, set by hand on the Relationships screen. Replaced the 0–100
 * lead score at the client's request; Urgent was added on top of the
 * prototype's Low/Medium/High. Listed lowest first, so a higher index is a
 * higher priority.
 */
export const LEAD_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const

export type LeadPriority = (typeof LEAD_PRIORITIES)[number]

/** Badge colour per priority, from the prototype's Relationships screen. */
export const LEAD_PRIORITY_CLASSES: Record<LeadPriority, { badge: string; dot: string }> = {
  Low: { badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-600' },
  Medium: { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  High: { badge: 'bg-red-50 text-red-700', dot: 'bg-red-600' },
  Urgent: { badge: 'bg-red-600 text-white', dot: 'bg-white' },
}

/**
 * Compare for sorting, highest priority first: Urgent, High, Medium, Low,
 * then organisations with no priority set.
 */
export function byLeadPriority(a: LeadPriority | null, b: LeadPriority | null): number {
  const rank = (priority: LeadPriority | null) =>
    priority === null ? -1 : LEAD_PRIORITIES.indexOf(priority)
  return rank(b) - rank(a)
}

/**
 * The priority an old 0–100 lead score stands for. Never Urgent: urgency is a
 * judgement call, not something a score can say.
 */
export function leadScoreToPriority(score: number): LeadPriority {
  if (score >= 67) return 'High'
  if (score >= 34) return 'Medium'
  return 'Low'
}

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
