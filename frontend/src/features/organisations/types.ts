import type { Organisation } from '@/types/firestore'
import type { LoggedActivityType, PipelineStage } from '@/features/organisations/constants'
import { truncate } from '@/lib/utils'

/**
 * An entry in `organisations/{id}/activities`.
 *
 * Holds both stage changes (written by the app) and hand-logged meetings,
 * calls, emails and notes, which is why `type` is a union rather than a flag —
 * the Activity Timeline and the dashboard's Recent Activity both read this.
 */
export interface OrganisationActivity {
  id: string
  /** `stage_change` is written by the app; the rest are logged by hand. */
  type: 'stage_change' | LoggedActivityType

  /** Stage changes only. */
  fromStage: PipelineStage | null
  toStage: PipelineStage | null

  /** Logged activities only. When the interaction happened, not when it was recorded. */
  occurredAt: number | null
  attendees: string | null
  agenda: string | null
  notes: string | null
  outcome: string | null
  actionItems: string | null
  nextFollowUp: string | null
  /** Video call or dial-in link for the meeting. */
  meetingLink: string | null
  /** Agendas, minutes, contracts — anything the interaction refers to. */
  documentLinks: string[]

  /** Who recorded it: their display name or email, and their uid. */
  actorUid: string
  actorLabel: string | null
  createdAt: number
  /** Archived entries stay in the timeline's archive section and can be restored. */
  deletedAt: number | null
}

/** Narrowing helper — a hand-logged interaction rather than a stage change. */
export function isLoggedActivity(
  activity: OrganisationActivity
): activity is OrganisationActivity & { type: LoggedActivityType } {
  return activity.type !== 'stage_change'
}

/**
 * One line describing an activity — shared by the dashboard's Recent Activity
 * and the profile's Activity Timeline so both say the same thing.
 */
export function describeActivity(activity: OrganisationActivity): string {
  if (isLoggedActivity(activity)) {
    const summary = activity.agenda ?? activity.notes
    return summary ? `${activity.type} logged: ${truncate(summary, 60)}` : `${activity.type} logged`
  }
  return activity.fromStage
    ? `Moved from ${activity.fromStage} to ${activity.toStage}`
    : `Started at ${activity.toStage}`
}

/**
 * An organisation as it crosses the server/client boundary.
 *
 * Firestore Timestamps are class instances and cannot be serialised into a
 * Client Component, so the Server Actions convert every timestamp to
 * milliseconds. Components receive this shape, never `Organisation`.
 */
export type OrganisationListItem = Omit<
  Organisation,
  'createdAt' | 'updatedAt' | 'lastActivityAt' | 'deletedAt' | 'nextActionDueAt'
> & {
  createdAt: number
  updatedAt: number
  lastActivityAt: number
  deletedAt: number | null
  nextActionDueAt: number | null
}
