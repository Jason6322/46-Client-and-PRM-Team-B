'use server'

import { revalidatePath } from 'next/cache'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { requireAuth } from '@/actions/auth.actions'
import { adminDb } from '@/lib/firebase/admin'
import { createOpportunitySchema, updateOpportunitySchema } from '@/lib/validations/opportunity'
import type { ActionResult } from '@/types'
import type { Opportunity } from '@/types/firestore'
import type { OpportunityListItem } from '@/features/opportunities/types'

/**
 * Opportunity Server Actions.
 *
 * Same conventions as organisations: authenticate first, validate with Zod,
 * return ActionResult, soft-delete rather than remove.
 */

const COLLECTION = 'opportunities'
const ORGANISATIONS = 'organisations'

function serialise(id: string, data: FirebaseFirestore.DocumentData): OpportunityListItem {
  const toMillis = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : Date.now())
  const text = (value: unknown) => (typeof value === 'string' ? value : null)

  return {
    ...(data as Omit<Opportunity, 'id'>),
    id,
    nextStep: text(data.nextStep),
    proposalDocument: text(data.proposalDocument),
    description: text(data.description),
    expectedOutcome: text(data.expectedOutcome),
    completedAt: data.completedAt instanceof Timestamp ? data.completedAt.toMillis() : null,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    deletedAt: data.deletedAt instanceof Timestamp ? data.deletedAt.toMillis() : null,
  }
}

/** Every open opportunity, most recently updated first. */
export async function listOpportunities(): Promise<ActionResult<OpportunityListItem[]>> {
  await requireAuth()

  try {
    const snapshot = await adminDb.collection(COLLECTION).orderBy('updatedAt', 'desc').get()

    return {
      success: true,
      data: snapshot.docs
        .map((doc) => serialise(doc.id, doc.data()))
        .filter((opportunity) => opportunity.deletedAt === null),
    }
  } catch {
    return { success: false, error: 'Failed to load opportunities' }
  }
}

/**
 * Opportunities for one organisation.
 *
 * Filtered in memory for the same reason as the organisation lists: pairing a
 * where clause with an orderBy on another field would need a composite index.
 */
export async function listOpportunitiesForOrganisation(
  organisationId: string
): Promise<ActionResult<OpportunityListItem[]>> {
  const all = await listOpportunities()

  if (!all.success || !all.data) return all

  return {
    success: true,
    data: all.data.filter((opportunity) => opportunity.organisationId === organisationId),
  }
}

export async function getOpportunity(id: string): Promise<ActionResult<OpportunityListItem>> {
  await requireAuth()

  try {
    const snapshot = await adminDb.collection(COLLECTION).doc(id).get()
    const data = snapshot.data()

    if (!snapshot.exists || !data || data.deletedAt !== null) {
      return { success: false, error: 'Opportunity not found' }
    }

    return { success: true, data: serialise(snapshot.id, data) }
  } catch {
    return { success: false, error: 'Failed to load opportunity' }
  }
}

/**
 * Create an opportunity against an organisation.
 *
 * The organisation's name is copied onto the record so the list can render
 * without reading every organisation. It is refreshed on update, so a rename
 * catches up the next time the opportunity is saved.
 */
export async function createOpportunity(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireAuth()

  const parsed = createOpportunitySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid opportunity' }
  }

  try {
    const organisation = await adminDb
      .collection(ORGANISATIONS)
      .doc(parsed.data.organisationId)
      .get()
    const organisationData = organisation.data()

    if (!organisation.exists || !organisationData || organisationData.deletedAt !== null) {
      return { success: false, error: 'Organisation not found' }
    }

    const now = FieldValue.serverTimestamp()
    const ref = await adminDb.collection(COLLECTION).add({
      ...parsed.data,
      organisationName: organisationData.name,
      completedAt: null,
      createdBy: session.uid,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      _schemaVersion: 1,
    })

    revalidatePath('/opportunities')
    revalidatePath('/dashboard')
    return { success: true, data: { id: ref.id } }
  } catch {
    return { success: false, error: 'Failed to create opportunity' }
  }
}

/** Edit an opportunity. The organisation it belongs to cannot be changed. */
export async function updateOpportunity(id: string, input: unknown): Promise<ActionResult> {
  await requireAuth()

  const parsed = updateOpportunitySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid opportunity' }
  }

  try {
    await adminDb
      .collection(COLLECTION)
      .doc(id)
      .update({ ...parsed.data, updatedAt: FieldValue.serverTimestamp() })

    revalidatePath('/opportunities')
    revalidatePath('/dashboard')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update opportunity' }
  }
}

/** Mark an opportunity complete, or reopen it. */
export async function setOpportunityComplete(id: string, complete: boolean): Promise<ActionResult> {
  await requireAuth()

  try {
    await adminDb
      .collection(COLLECTION)
      .doc(id)
      .update({
        completedAt: complete ? FieldValue.serverTimestamp() : null,
        updatedAt: FieldValue.serverTimestamp(),
      })

    revalidatePath('/opportunities')
    revalidatePath('/dashboard')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update opportunity' }
  }
}

/** Archive an opportunity — soft delete, the record is kept. */
export async function archiveOpportunity(id: string): Promise<ActionResult> {
  await requireAuth()

  try {
    await adminDb.collection(COLLECTION).doc(id).update({
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    revalidatePath('/opportunities')
    revalidatePath('/dashboard')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to archive opportunity' }
  }
}
