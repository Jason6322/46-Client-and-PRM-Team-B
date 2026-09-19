/**
 * Retention policy for archived organisations.
 *
 * Archiving is a soft delete: the record keeps its data and can be restored.
 * The intent is that archived records are permanently removed after
 * RETENTION_DAYS.
 *
 * NOTE: nothing enforces this yet. Permanent removal needs something that runs
 * on a schedule, and the two options both sit outside this app's code —
 * a Vercel Cron job hitting a protected route handler, or a Firestore TTL
 * policy on a dedicated field. Both are deployment configuration rather than
 * application code. Until one is set up, this constant only drives the date
 * shown on the archived screen.
 */

export const RETENTION_DAYS = 30

const DAY_IN_MS = 86_400_000

/** The date an organisation archived at `deletedAt` is scheduled for removal. */
export function purgeDateFor(deletedAt: number | Date): Date {
  const archivedMs = deletedAt instanceof Date ? deletedAt.getTime() : deletedAt
  return new Date(archivedMs + RETENTION_DAYS * DAY_IN_MS)
}

/** Whether an organisation archived at `deletedAt` is past its retention window. */
export function isPastRetention(deletedAt: number | Date): boolean {
  return purgeDateFor(deletedAt).getTime() <= Date.now()
}
