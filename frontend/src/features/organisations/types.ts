import type { Organisation } from '@/types/firestore'
import type { PipelineStage } from '@/features/organisations/constants'

/**
 * An entry in `organisations/{id}/activities`.
 *
 * Stage changes are the first kind recorded. Calls, meetings and emails are
 * meant to land here too, which is why `type` is a union rather than a flag —
 * the Activity Timeline and the dashboard's Recent Activity both read this.
 */
export interface OrganisationActivity {
  id: string
  type: 'stage_change'
  fromStage: PipelineStage | null
  toStage: PipelineStage
  /** Who made the change: their display name or email, and their uid. */
  actorUid: string
  actorLabel: string | null
  createdAt: number
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
