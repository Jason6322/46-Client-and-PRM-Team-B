import type { TeamMember } from '@/types/firestore'

/**
 * A users/{uid} profile as a team member: the display name, or the email for
 * someone who signed up without one.
 */
export function toTeamMember(uid: string, profile: Record<string, unknown>): TeamMember {
  const displayName = typeof profile.displayName === 'string' ? profile.displayName.trim() : ''
  const email = typeof profile.email === 'string' ? profile.email : ''
  return { uid, name: displayName || email || 'Unnamed user' }
}

/** Team members as stored on a record, dropping anything malformed. */
export function readTeamMembers(value: unknown): TeamMember[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (entry): entry is TeamMember =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as TeamMember).uid === 'string' &&
      typeof (entry as TeamMember).name === 'string'
  )
}

export const byName = (a: TeamMember, b: TeamMember) => a.name.localeCompare(b.name)
