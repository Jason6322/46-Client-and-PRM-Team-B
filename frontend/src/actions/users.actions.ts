'use server'

import { requireAuth } from '@/actions/auth.actions'
import { CACHE_TAGS, cached } from '@/lib/cache'
import { adminDb } from '@/lib/firebase/admin'
import { byName, toTeamMember } from '@/lib/teamMembers'
import type { ActionResult } from '@/types'
import type { TeamMember } from '@/types/firestore'

/** Cached (see lib/cache.ts); the admin actions invalidate it on every change. */
const activeTeamMembers = cached(
  async () => {
    const snapshot = await adminDb.collection('users').get()
    return snapshot.docs
      .filter((doc) => doc.get('deletedAt') == null)
      .map((doc) => toTeamMember(doc.id, doc.data()))
      .sort(byName)
  },
  'team-members',
  [CACHE_TAGS.users]
)

/**
 * Everyone with a profile in users/, for "assigned team member" pickers.
 *
 * Read with the Admin SDK because the security rules only let a user read
 * their own profile. Returns names and uids only, never emails or roles.
 */
export async function listTeamMembers(): Promise<ActionResult<TeamMember[]>> {
  await requireAuth()

  try {
    return { success: true, data: await activeTeamMembers() }
  } catch {
    return { success: false, error: 'Failed to load team members' }
  }
}
