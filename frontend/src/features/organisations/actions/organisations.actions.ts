'use server'

import { revalidatePath } from 'next/cache'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { requireAuth } from '@/actions/auth.actions'
import { adminDb } from '@/lib/firebase/admin'
import { createOrganisationSchema, updateOrganisationSchema } from '@/lib/validations/organisation'
import { DEFAULT_PIPELINE_STAGE } from '@/features/organisations/constants'
import type { ActionResult } from '@/types'
import type { Organisation } from '@/types/firestore'

/**
 * Organisation Server Actions — create, view, edit and archive.
 *
 * Archiving is a soft delete (`deletedAt`), per the convention in CLAUDE.md;
 * documents are never hard-deleted. Every action authenticates first and
 * returns the ActionResult shape.
 */

const COLLECTION = 'organisations'

/** Firestore Timestamps cannot cross the server/client boundary — send millis. */
type SerialisedOrganisation = Omit<
  Organisation,
  'createdAt' | 'updatedAt' | 'lastActivityAt' | 'deletedAt'
> & {
  createdAt: number
  updatedAt: number
  lastActivityAt: number
  deletedAt: number | null
}

function serialise(id: string, data: FirebaseFirestore.DocumentData): SerialisedOrganisation {
  const toMillis = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : Date.now())

  return {
    ...(data as Omit<Organisation, 'id'>),
    id,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    lastActivityAt: toMillis(data.lastActivityAt),
    deletedAt: data.deletedAt instanceof Timestamp ? data.deletedAt.toMillis() : null,
  }
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
    const ref = await adminDb.collection(COLLECTION).add({
      ...parsed.data,
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
export async function getOrganisation(id: string): Promise<ActionResult<SerialisedOrganisation>> {
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

/** List every active organisation, most recently active first. */
export async function listOrganisations(): Promise<ActionResult<SerialisedOrganisation[]>> {
  await requireAuth()

  try {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('deletedAt', '==', null)
      .orderBy('lastActivityAt', 'desc')
      .get()

    return {
      success: true,
      data: snapshot.docs.map((doc) => serialise(doc.id, doc.data())),
    }
  } catch {
    return { success: false, error: 'Failed to load organisations' }
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
    await adminDb
      .collection(COLLECTION)
      .doc(id)
      .update({
        ...parsed.data,
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
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to restore organisation' }
  }
}
