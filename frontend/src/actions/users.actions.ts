'use server'

import { requireAuth } from '@/actions/auth.actions'
import { adminDb } from '@/lib/firebase/admin'
import { byName, toTeamMember } from '@/lib/teamMembers'
import type { ActionResult } from '@/types'
import type { TeamMember } from '@/types/firestore'

/**
 * Everyone with a profile in users/, for "assigned team member" pickers.
 *
 * Read with the Admin SDK because the security rules only let a user read
 * their own profile. Returns names and uids only, never emails or roles.
 */
export async function listTeamMembers(): Promise<ActionResult<TeamMember[]>> {
  await requireAuth()

  try {
    const snapshot = await adminDb.collection('users').get()

    return {
      success: true,
      data: snapshot.docs
        .filter((doc) => doc.get('deletedAt') == null)
        .map((doc) => toTeamMember(doc.id, doc.data()))
        .sort(byName),
    }
  } catch {
    return { success: false, error: 'Failed to load team members' }
  }
}
