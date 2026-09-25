'use server'

import { revalidatePath } from 'next/cache'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { requireAuth } from '@/actions/auth.actions'
import { adminDb } from '@/lib/firebase/admin'
import {
  createOrganisationSchema,
  nextActionSchema,
  pipelineStageSchema,
  updateOrganisationSchema,
} from '@/lib/validations/organisation'
import { DEFAULT_PIPELINE_STAGE, RELATIONSHIP_STATUSES } from '@/features/organisations/constants'
import { dateOnlyToDate } from '@/features/organisations/followUp'
import type { ActionResult } from '@/types'
import type { Organisation } from '@/types/firestore'
import type { OrganisationListItem } from '@/features/organisations/types'

/**
 * Organisation Server Actions — create, view, edit and archive.
 *
 * Archiving is a soft delete (`deletedAt`), per the convention in CLAUDE.md;
 * documents are never hard-deleted. Every action authenticates first and
 * returns the ActionResult shape.
 */

const COLLECTION = 'organisations'

function serialise(id: string, data: FirebaseFirestore.DocumentData): OrganisationListItem {
  const toMillis = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : Date.now())

  return {
    ...(data as Omit<Organisation, 'id'>),
    id,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    lastActivityAt: toMillis(data.lastActivityAt),
    deletedAt: data.deletedAt instanceof Timestamp ? data.deletedAt.toMillis() : null,
    // Documents created before these fields existed do not carry them.
    relationshipStatus: RELATIONSHIP_STATUSES.includes(data.relationshipStatus)
      ? data.relationshipStatus
      : null,
    nextAction: typeof data.nextAction === 'string' ? data.nextAction : null,
    nextActionDueAt:
      data.nextActionDueAt instanceof Timestamp ? data.nextActionDueAt.toMillis() : null,
  }
}

/** "2026-09-02" from a date input → a Firestore Timestamp, or null for none. */
function toDueTimestamp(value: string | null): Timestamp | null {
  return value === null ? null : Timestamp.fromDate(dateOnlyToDate(value))
}

/** Create an organisation. Returns the new document id. */
export async function createOrganisation(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireAuth()

  const parsed = createOrganisationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid organisation' }
  }

  try {
    const now = FieldValue.serverTimestamp()
    const { nextActionDueAt, ...fields } = parsed.data
    const ref = await adminDb.collection(COLLECTION).add({
      ...fields,
      nextActionDueAt: toDueTimestamp(nextActionDueAt),
      pipelineStage: parsed.data.pipelineStage ?? DEFAULT_PIPELINE_STAGE,
      createdBy: session.uid,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      deletedAt: null,
      _schemaVersion: 1,
    })

    revalidatePath('/organisations')
    return { success: true, data: { id: ref.id } }
  } catch {
    return { success: false, error: 'Failed to create organisation' }
  }
}

/** Fetch a single organisation. Archived records are treated as missing. */
export async function getOrganisation(id: string): Promise<ActionResult<OrganisationListItem>> {
  await requireAuth()

  try {
    const snapshot = await adminDb.collection(COLLECTION).doc(id).get()
    const data = snapshot.data()

    if (!snapshot.exists || !data || data.deletedAt !== null) {
      return { success: false, error: 'Organisation not found' }
    }

    return { success: true, data: serialise(snapshot.id, data) }
  } catch {
    return { success: false, error: 'Failed to load organisation' }
  }
}

/**
 * List every active organisation, most recently active first.
 *
 * Archived records are filtered out in memory rather than with a
 * `where('deletedAt', '==', null)` clause. Combining that filter with an
 * orderBy on a different field would need a composite index; ordering alone
 * uses the automatic single-field index. Revisit if the collection outgrows
 * a single fetch.
 */
export async function listOrganisations(): Promise<ActionResult<OrganisationListItem[]>> {
  await requireAuth()

  try {
    const snapshot = await adminDb.collection(COLLECTION).orderBy('lastActivityAt', 'desc').get()

    return {
      success: true,
      data: snapshot.docs
        .map((doc) => serialise(doc.id, doc.data()))
        .filter((organisation) => organisation.deletedAt === null),
    }
  } catch {
    return { success: false, error: 'Failed to load organisations' }
  }
}

/**
 * List archived organisations, most recently archived first.
 *
 * Filtered in memory for the same reason as listOrganisations — combining a
 * filter with an orderBy on another field would need a composite index.
 */
export async function listArchivedOrganisations(): Promise<ActionResult<OrganisationListItem[]>> {
  await requireAuth()

  try {
    const snapshot = await adminDb.collection(COLLECTION).orderBy('lastActivityAt', 'desc').get()

    return {
      success: true,
      data: snapshot.docs
        .map((doc) => serialise(doc.id, doc.data()))
        .filter((organisation) => organisation.deletedAt !== null)
        .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    }
  } catch {
    return { success: false, error: 'Failed to load archived organisations' }
  }
}

/** Edit an organisation. Accepts a partial set of fields. */
export async function updateOrganisation(id: string, input: unknown): Promise<ActionResult> {
  await requireAuth()

  const parsed = updateOrganisationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid organisation' }
  }

  try {
    // A partial update may omit the due date; only convert it when present,
    // so an edit that doesn't send it leaves the stored value alone.
    const { nextActionDueAt, ...fields } = parsed.data
    await adminDb
      .collection(COLLECTION)
      .doc(id)
      .update({
        ...fields,
        ...(nextActionDueAt !== undefined && {
          nextActionDueAt: toDueTimestamp(nextActionDueAt),
        }),
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
      })

    revalidatePath('/organisations')
    revalidatePath(`/organisations/${id}`)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update organisation' }
  }
}

/**
 * Move an organisation to a different pipeline stage.
 *
 * Kept separate from updateOrganisation because advancing a relationship is
 * the most frequent action in the CRM and should not require submitting the
 * whole edit form. Any stage can move to any other — relationships genuinely
 * move backwards, so this is deliberately not a one-way funnel.
 */
export async function changePipelineStage(id: string, stage: unknown): Promise<ActionResult> {
  await requireAuth()

  const parsed = pipelineStageSchema.safeParse(stage)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Unknown pipeline stage' }
  }

  try {
    await adminDb.collection(COLLECTION).doc(id).update({
      pipelineStage: parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
      lastActivityAt: FieldValue.serverTimestamp(),
    })

    revalidatePath('/organisations')
    revalidatePath(`/organisations/${id}`)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to change pipeline stage' }
  }
}

/**
 * Set or clear an organisation's follow-up from the profile.
 *
 * Separate from updateOrganisation for the same reason as the stage control:
 * logging the next follow-up should not mean submitting the whole edit form.
 * Passing an empty action and no date clears it.
 */
export async function setNextAction(id: string, input: unknown): Promise<ActionResult> {
  await requireAuth()

  const parsed = nextActionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid follow-up' }
  }

  try {
    await adminDb
      .collection(COLLECTION)
      .doc(id)
      .update({
        nextAction: parsed.data.nextAction,
        nextActionDueAt: toDueTimestamp(parsed.data.nextActionDueAt),
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
      })

    revalidatePath('/organisations')
    revalidatePath(`/organisations/${id}`)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to save follow-up' }
  }
}

/** Archive an organisation — soft delete, the record is kept. */
export async function archiveOrganisation(id: string): Promise<ActionResult> {
  await requireAuth()

  try {
    await adminDb.collection(COLLECTION).doc(id).update({
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    revalidatePath('/organisations')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to archive organisation' }
  }
}

/** Restore an archived organisation. */
export async function restoreOrganisation(id: string): Promise<ActionResult> {
  await requireAuth()

  try {
    await adminDb.collection(COLLECTION).doc(id).update({
      deletedAt: null,
      updatedAt: FieldValue.serverTimestamp(),
    })

    revalidatePath('/organisations')
    revalidatePath('/organisations/archived')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to restore organisation' }
  }
}
