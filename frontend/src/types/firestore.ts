import type { Timestamp } from 'firebase/firestore'
import type {
  OrganisationType,
  PipelineStage,
  RelationshipStatus,
} from '@/features/organisations/constants'

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
  /**
   * Relationship status, shown beside the stage as "Negotiation · Active".
   * Null until someone sets it; older documents do not carry the field.
   */
  relationshipStatus: RelationshipStatus | null
  primaryContact: OrganisationContact
  secondaryContact: OrganisationContact | null
  notes: string | null
  /**
   * Relationship management — the Research and Outreach & Follow-up cards on
   * the Relationships screen. All optional; older documents carry none of them.
   *
   * "Recommended next action" on that screen is `nextAction`, and "Assigned
   * team member" is `relationshipOwner`; neither is duplicated here.
   */
  businessResearchNotes: string | null
  qualificationInfo: string | null
  /** 0–100, entered by hand. Shown as a progress bar. */
  leadScore: number | null
  researchStatus: string | null
  businessBrief: string | null
  outreachStatus: string | null
  communicationRecord: string | null
  followUpStatus: string | null
  /** Strategic notes about the relationship, distinct from the contact notes. */
  relationshipNotes: string | null
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
