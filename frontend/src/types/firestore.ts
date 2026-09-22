import type { Timestamp } from 'firebase/firestore'
import type { OrganisationType, PipelineStage } from '@/features/organisations/constants'

/**
 * Firestore collection type definitions.
 *
 * Keep in sync with:
 *   - src/lib/firebase/firestore.ts  (typed collection exports)
 *   - firebase/firestore.rules       (security rules)
 *   - docs/FIRESTORE-SCHEMA.md       (schema documentation)
 *
 * When adding a new collection, use the /firebase-collection skill.
 */

export interface UserProfile {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
  role: 'user'
  createdAt: Timestamp
  updatedAt: Timestamp
  _schemaVersion: 1
}

export type CreateUserProfileInput = Omit<UserProfile, 'createdAt' | 'updatedAt'>

/** A named person at an organisation. Shape is shared by primary and secondary. */
export interface OrganisationContact {
  name: string
  role: string | null
  email: string | null
  phone: string | null
}

/**
 * organisations/{id} — the CRM's core record.
 *
 * Archiving is a soft delete: `deletedAt` is set and the document stays put.
 * That is separate from the 'Archived' pipeline stage, which means the
 * relationship itself ended while the record remains active in the CRM.
 */
export interface Organisation {
  id: string
  name: string
  type: OrganisationType
  industry: string | null
  country: string
  website: string | null
  relationshipOwner: string
  tags: string[]
  pipelineStage: PipelineStage
  primaryContact: OrganisationContact
  secondaryContact: OrganisationContact | null
  notes: string | null
  /** The next follow-up owed to this organisation, e.g. "Send revised contract". */
  nextAction: string | null
  /** When the follow-up is due. Stored at 12:00 UTC on the due day. */
  nextActionDueAt: Timestamp | null
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  lastActivityAt: Timestamp
  deletedAt: Timestamp | null
  _schemaVersion: 1
}

export type CreateOrganisationInput = Omit<
  Organisation,
  'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'lastActivityAt' | 'deletedAt' | '_schemaVersion'
>

export type UpdateOrganisationInput = Partial<CreateOrganisationInput>
