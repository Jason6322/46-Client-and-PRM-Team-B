import type { Opportunity } from '@/types/firestore'

/** An opportunity as it crosses to the client — Timestamps become millis. */
export type OpportunityListItem = Omit<
  Opportunity,
  'completedAt' | 'createdAt' | 'updatedAt' | 'deletedAt'
> & {
  completedAt: number | null
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}
