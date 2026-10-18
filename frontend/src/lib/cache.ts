import 'server-only'
import { revalidateTag, unstable_cache } from 'next/cache'

/**
 * Cross-request cache for Firestore reads.
 *
 * The free Spark plan allows 50,000 reads a day, and every page used to read
 * its data afresh — the dashboard alone is several hundred reads — so a few
 * dozen page loads across the team could exhaust it. Cached reads are served
 * from Next.js's data cache instead (on Vercel it is shared by every instance
 * of a deployment; locally it lives in .next/cache).
 *
 * Every write in the app calls invalidate() for what it changed, so people see
 * their own edits at once. Writes made outside the app — the seed script, the
 * Firebase console, another developer's local server — show up within
 * CACHE_SECONDS.
 *
 * Only data reads are cached. Auth (requireAuth, requireAdmin, the session
 * route's profile check) always reads fresh, so a deactivated user is locked
 * out immediately. Cached functions must not read cookies or headers: call
 * requireAuth() first, outside the cached function.
 *
 * Uses unstable_cache, the supported API when Cache Components (`'use cache'`)
 * is not enabled — see node_modules/next/dist/docs/01-app/02-guides/
 * caching-without-cache-components.md.
 */

export const CACHE_TAGS = {
  /** organisations/* documents, archived ones included. */
  organisations: 'organisations',
  /**
   * Reads across every organisation's activities — the recent-activity feed
   * and meetings in a date range. Any activity write expires it.
   */
  activityFeed: 'activity-feed',
  opportunities: 'opportunities',
  users: 'users',
} as const

/**
 * One organisation's activities. Per organisation, so logging a note against
 * one doesn't make every other organisation's timeline re-read.
 */
export function activitiesTag(organisationId: string) {
  return `activities:${organisationId}` as const
}

export type CacheTag =
  (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS] | ReturnType<typeof activitiesTag>

/**
 * Backstop for writes the app didn't make. In production those are rare (the
 * seed script, the Firebase console), so an hour; locally, five minutes,
 * because teammates' dev servers write to the same project and each has its
 * own cache.
 */
export const CACHE_SECONDS = process.env.NODE_ENV === 'production' ? 3600 : 300

/**
 * Wrap a Firestore read. `key` must be unique per function; the arguments are
 * added to the cache key automatically. Results must be JSON-serialisable
 * (millis, not Timestamps). A read that throws is not cached.
 *
 * `tags` may be a function of the arguments, for per-record tags such as
 * activitiesTag(id).
 */
export function cached<Args extends unknown[], Result>(
  read: (...args: Args) => Promise<Result>,
  key: string,
  tags: CacheTag[] | ((...args: Args) => CacheTag[])
): (...args: Args) => Promise<Result> {
  if (Array.isArray(tags)) {
    return unstable_cache(read, [key], { tags, revalidate: CACHE_SECONDS })
  }
  // The wrapper is built per call so its tags can depend on the arguments;
  // the cache entry is still keyed by `key` plus the arguments.
  return (...args: Args) =>
    unstable_cache(read, [key], { tags: tags(...args), revalidate: CACHE_SECONDS })(...args)
}

/**
 * Expire cached reads after a write. `{ expire: 0 }` makes the next request
 * wait for fresh data rather than serve the stale copy, so the person who
 * made the change sees it on the redirect or refresh that follows.
 */
export function invalidate(...tags: CacheTag[]) {
  for (const tag of tags) revalidateTag(tag, { expire: 0 })
}
