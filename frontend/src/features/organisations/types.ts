import type { Organisation } from '@/types/firestore'

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
