'use server'

import { revalidatePath } from 'next/cache'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { requireAuth } from '@/actions/auth.actions'
import { idSchema } from '@/lib/validations/common'
import { adminDb } from '@/lib/firebase/admin'
import {
  createOrganisationSchema,
  logActivitySchema,
  nextActionSchema,
  pipelineStageSchema,
  relationshipManagementSchema,
  updateOrganisationSchema,
} from '@/lib/validations/organisation'
import {
  DEFAULT_PIPELINE_STAGE,
  LEAD_PRIORITIES,
  RELATIONSHIP_STATUSES,
  leadScoreToPriority,
  nextPipelineStage,
  type PipelineStage,
} from '@/features/organisations/constants'
import { dateOnlyToDate } from '@/features/organisations/followUp'
import type { ActionResult } from '@/types'
import type { Organisation } from '@/types/firestore'
import type {
  MeetingWithOrganisation,
  OrganisationActivity,
  OrganisationListItem,
} from '@/features/organisations/types'

/**
 * Organisation Server Actions — create, view, edit and archive.
 *
 * Archiving is a soft delete (`deletedAt`), per the convention in CLAUDE.md;
 * documents are never hard-deleted. Every action authenticates first and
 * returns the ActionResult shape.
 */

const COLLECTION = 'organisations'
const ACTIVITIES = 'activities'

function serialise(id: string, data: FirebaseFirestore.DocumentData): OrganisationListItem {
  const toMillis = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : Date.now())
  /** Optional string fields are absent on documents written before they existed. */
  const text = (value: unknown) => (typeof value === 'string' ? value : null)

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
    relationshipOwner: text(data.relationshipOwner) || null,
    businessResearchNotes: text(data.businessResearchNotes),
    qualificationInfo: text(data.qualificationInfo),
    leadPriority: LEAD_PRIORITIES.includes(data.leadPriority)
      ? data.leadPriority
      : typeof data.leadScore === 'number'
        ? leadScoreToPriority(data.leadScore)
        : null,
    researchStatus: text(data.researchStatus),
    businessBrief: text(data.businessBrief),
    outreachStatus: text(data.outreachStatus),
    communicationRecord: text(data.communicationRecord),
    followUpStatus: text(data.followUpStatus),
    relationshipNotes: text(data.relationshipNotes),
    nextAction: text(data.nextAction),
    nextActionDueAt:
      data.nextActionDueAt instanceof Timestamp ? data.nextActionDueAt.toMillis() : null,
  }
}

/**
 * Record a stage change in `organisations/{id}/activities`.
 *
 * Written as part of the same request as the stage change itself. A failure
 * here must not fail the move, so the caller catches it — losing a history
 * entry is much less bad than refusing a stage change.
 */
async function recordStageChange(
  organisationId: string,
  fromStage: PipelineStage | null,
  toStage: PipelineStage,
  actorUid: string,
  actorLabel: string | null
) {
  await adminDb.collection(COLLECTION).doc(organisationId).collection(ACTIVITIES).add({
    type: 'stage_change',
    fromStage,
    toStage,
    actorUid,
    actorLabel,
    createdAt: FieldValue.serverTimestamp(),
  })
}

/** Stage changes and, in time, calls and meetings — newest first. */
export async function listOrganisationActivities(
  organisationId: string
): Promise<ActionResult<OrganisationActivity[]>> {
  await requireAuth()

  try {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .doc(organisationId)
      .collection(ACTIVITIES)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    return { success: true, data: snapshot.docs.map(toActivity) }
  } catch {
    return { success: false, error: 'Failed to load activity' }
  }
}

function toActivity(doc: FirebaseFirestore.QueryDocumentSnapshot): OrganisationActivity {
  const data = doc.data()
  const text = (value: unknown) => (typeof value === 'string' ? value : null)

  return {
    id: doc.id,
    type: data.type ?? 'stage_change',
    fromStage: data.fromStage ?? null,
    toStage: data.toStage ?? null,
    occurredAt: data.occurredAt instanceof Timestamp ? data.occurredAt.toMillis() : null,
    responsible: text(data.responsible),
    attendees: text(data.attendees),
    agenda: text(data.agenda),
    notes: text(data.notes),
    outcome: text(data.outcome),
    actionItems: text(data.actionItems),
    nextFollowUp: text(data.nextFollowUp),
    meetingLink: text(data.meetingLink),
    documentLinks: Array.isArray(data.documentLinks)
      ? data.documentLinks.filter((link: unknown): link is string => typeof link === 'string')
      : [],
    actorUid: data.actorUid ?? '',
    actorLabel: text(data.actorLabel),
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
    deletedAt: data.deletedAt instanceof Timestamp ? data.deletedAt.toMillis() : null,
  }
}

const upcomingMeetingsSchema = z.object({
  organisationIds: z.array(idSchema).max(500),
  from: z.number().int(),
  to: z.number().int(),
})

/**
 * Meetings between `from` and `to` (epoch millis) across the given
 * organisations, soonest first — for the dashboard's upcoming meetings.
 * See meetingsBetween for the cost.
 */
export async function listUpcomingMeetings(
  input: z.input<typeof upcomingMeetingsSchema>
): Promise<ActionResult<{ organisationId: string; activity: OrganisationActivity }[]>> {
  await requireAuth()

  const parsed = upcomingMeetingsSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid meeting range' }
  const { organisationIds, from, to } = parsed.data

  try {
    return { success: true, data: await meetingsBetween(organisationIds, from, to) }
  } catch {
    return { success: false, error: 'Failed to load upcoming meetings' }
  }
}

/** Long enough for a month view with its padding days, short enough to bound the reads. */
const MAX_CALENDAR_RANGE = 45 * 24 * 60 * 60 * 1000

const calendarMeetingsSchema = z
  .object({ from: z.number().int(), to: z.number().int() })
  .refine(({ from, to }) => to >= from && to - from <= MAX_CALENDAR_RANGE)

/**
 * Meetings between `from` and `to` across every organisation, soonest first,
 * each with its organisation's name — for the calendar on every Meetings page,
 * so booking with one organisation shows what is already booked with the rest.
 *
 * Costs one read per organisation for the list plus about one per
 * organisation for the meetings, the same as the dashboard's upcoming meetings.
 */
export async function listCalendarMeetings(
  input: z.input<typeof calendarMeetingsSchema>
): Promise<ActionResult<MeetingWithOrganisation[]>> {
  await requireAuth()

  const parsed = calendarMeetingsSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid meeting range' }
  const { from, to } = parsed.data

  try {
    // Filtered in memory, like listOrganisations — documents written before
    // deletedAt existed lack the field and would not match a `== null` query.
    const snapshot = await adminDb.collection(COLLECTION).get()
    const names = new Map(
      snapshot.docs
        .filter((doc) => !(doc.data().deletedAt instanceof Timestamp))
        .map((doc) => [doc.id, String(doc.data().name ?? 'Unnamed organisation')])
    )
    const meetings = await meetingsBetween([...names.keys()], from, to)

    return {
      success: true,
      data: meetings.map((meeting) => ({
        ...meeting,
        organisationName: names.get(meeting.organisationId) ?? 'Unnamed organisation',
      })),
    }
  } catch {
    return { success: false, error: 'Failed to load meetings' }
  }
}

/**
 * Meetings between `from` and `to` (epoch millis) across the given
 * organisations, soonest first.
 *
 * One query per organisation, filtered on occurredAt alone so the automatic
 * single-field index serves it; type and archived are filtered here, which
 * avoids a composite index. Firestore bills a query that matches nothing as
 * one read, so this costs about one read per organisation.
 */
async function meetingsBetween(organisationIds: string[], from: number, to: number) {
  const snapshots = await Promise.all(
    organisationIds.map((organisationId) =>
      adminDb
        .collection(COLLECTION)
        .doc(organisationId)
        .collection(ACTIVITIES)
        .where('occurredAt', '>=', Timestamp.fromMillis(from))
        .where('occurredAt', '<=', Timestamp.fromMillis(to))
        .get()
    )
  )

  const meetings = snapshots.flatMap((snapshot, index) =>
    snapshot.docs
      .map(toActivity)
      .filter((activity) => activity.type === 'Meeting' && activity.deletedAt === null)
      .map((activity) => ({ organisationId: organisationIds[index]!, activity }))
  )

  return meetings.sort((a, b) => (a.activity.occurredAt ?? 0) - (b.activity.occurredAt ?? 0))
}

/**
 * Log a meeting, call, email or note against an organisation.
 *
 * Writes to the same activities subcollection as stage changes, so the
 * interaction timeline and the stage history are one ordered record rather
 * than two stores that have to be merged.
 */
export async function logActivity(
  organisationId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const session = await requireAuth()

  const parsed = logActivitySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid activity' }
  }

  try {
    const { occurredAt, ...fields } = parsed.data
    const ref = await adminDb
      .collection(COLLECTION)
      .doc(organisationId)
      .collection(ACTIVITIES)
      .add({
        ...fields,
        occurredAt: Timestamp.fromDate(new Date(occurredAt)),
        actorUid: session.uid,
        actorLabel: session.name ?? session.email ?? null,
        createdAt: FieldValue.serverTimestamp(),
        deletedAt: null,
      })

    // Logging an interaction is activity on the organisation, so the list
    // ordering and the "Last Activity" column reflect it.
    await adminDb.collection(COLLECTION).doc(organisationId).update({
      lastActivityAt: FieldValue.serverTimestamp(),
    })

    revalidatePath('/organisations')
    revalidatePath(`/organisations/${organisationId}`)
    revalidatePath('/meetings')
    revalidatePath(`/meetings/${organisationId}`)
    return { success: true, data: { id: ref.id } }
  } catch {
    return { success: false, error: 'Failed to log activity' }
  }
}

/**
 * Archive or restore a logged activity.
 *
 * A soft delete, per the convention in CLAUDE.md. Minutes and outcomes cannot
 * be reconstructed once gone, so a mis-click must be recoverable. Stage
 * changes are written by the app and are not archivable — the history would
 * stop matching the organisation's actual stage.
 */
export async function setActivityArchived(
  organisationId: string,
  activityId: string,
  archived: boolean
): Promise<ActionResult> {
  await requireAuth()

  try {
    const ref = adminDb
      .collection(COLLECTION)
      .doc(organisationId)
      .collection(ACTIVITIES)
      .doc(activityId)

    const snapshot = await ref.get()
    const data = snapshot.data()

    if (!snapshot.exists || !data) {
      return { success: false, error: 'Activity not found' }
    }

    if (data.type === 'stage_change') {
      return { success: false, error: 'Stage changes cannot be archived' }
    }

    await ref.update({ deletedAt: archived ? FieldValue.serverTimestamp() : null })

    revalidatePath(`/organisations/${organisationId}`)
    revalidatePath(`/meetings/${organisationId}`)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update activity' }
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
  const session = await requireAuth()

  const parsed = pipelineStageSchema.safeParse(stage)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Unknown pipeline stage' }
  }

  try {
    const ref = adminDb.collection(COLLECTION).doc(id)
    // Read the current stage first so the history entry records what it moved
    // from; the update itself would otherwise overwrite it without trace.
    const before = await ref.get()
    const fromStage = (before.data()?.pipelineStage as PipelineStage | undefined) ?? null

    await ref.update({
      pipelineStage: parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
      lastActivityAt: FieldValue.serverTimestamp(),
    })

    if (fromStage !== parsed.data) {
      await recordStageChange(
        id,
        fromStage,
        parsed.data,
        session.uid,
        session.name ?? session.email ?? null
      ).catch(() => {
        // History is best effort; the move itself has already succeeded.
      })
    }

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

/**
 * Save the Relationships screen.
 *
 * With `advanceStage`, also moves the organisation to the next pipeline stage —
 * the "Save & Move to Next Stage" button. At the last stage there is nowhere to
 * advance to, so only the fields are saved.
 */
export async function saveRelationshipManagement(
  id: string,
  input: unknown,
  advanceStage = false
): Promise<ActionResult<{ pipelineStage: PipelineStage }>> {
  const session = await requireAuth()

  const parsed = relationshipManagementSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid details' }
  }

  try {
    const ref = adminDb.collection(COLLECTION).doc(id)
    const snapshot = await ref.get()
    const data = snapshot.data()

    if (!snapshot.exists || !data || data.deletedAt !== null) {
      return { success: false, error: 'Organisation not found' }
    }

    const current = serialise(snapshot.id, data).pipelineStage
    const moved = advanceStage ? nextPipelineStage(current) : null

    await ref.update({
      ...parsed.data,
      // The priority now stands in for the old score; drop it so the two can
      // never disagree.
      leadScore: FieldValue.delete(),
      ...(moved !== null && { pipelineStage: moved }),
      updatedAt: FieldValue.serverTimestamp(),
      lastActivityAt: FieldValue.serverTimestamp(),
    })

    if (moved !== null) {
      await recordStageChange(
        id,
        current,
        moved,
        session.uid,
        session.name ?? session.email ?? null
      ).catch(() => {
        // History is best effort; the save itself has already succeeded.
      })
    }

    revalidatePath('/organisations')
    revalidatePath(`/organisations/${id}`)
    revalidatePath('/relationships')
    revalidatePath(`/relationships/${id}`)
    return { success: true, data: { pipelineStage: moved ?? current } }
  } catch {
    return { success: false, error: 'Failed to save relationship details' }
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

/**
 * Permanently delete an archived organisation, its activity history and its
 * opportunities. The client keeps archived records until they choose to remove
 * them, so this is the only hard delete and it refuses an active organisation —
 * archive first.
 */
export async function deleteOrganisationPermanently(id: unknown): Promise<ActionResult> {
  await requireAuth()

  const parsed = idSchema.safeParse(id)
  if (!parsed.success) {
    return { success: false, error: 'Invalid organisation' }
  }

  try {
    const ref = adminDb.collection(COLLECTION).doc(parsed.data)
    const snapshot = await ref.get()
    const data = snapshot.data()

    if (!snapshot.exists || !data) {
      return { success: false, error: 'Organisation not found' }
    }
    if (data.deletedAt === null) {
      return { success: false, error: 'Archive the organisation before deleting it' }
    }

    // Opportunities live in their own collection, so recursiveDelete won't
    // reach them; without this they would point at an organisation that is gone.
    const opportunities = await adminDb
      .collection('opportunities')
      .where('organisationId', '==', parsed.data)
      .get()
    const writer = adminDb.bulkWriter()
    for (const opportunity of opportunities.docs) {
      void writer.delete(opportunity.ref)
    }
    await writer.close()

    // Removes the organisation and its activities subcollection.
    await adminDb.recursiveDelete(ref)

    revalidatePath('/organisations/archived')
    revalidatePath('/opportunities')
    revalidatePath('/dashboard')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to delete organisation' }
  }
}
