import 'server-only'
import {
  listOrganisationActivities,
  listUpcomingMeetings,
} from '@/features/organisations/actions/organisations.actions'
import type {
  MeetingWithOrganisation,
  OrganisationActivity,
  OrganisationListItem,
} from '@/features/organisations/types'

/**
 * Reads shared by the dashboard and its "See all" pages, so a card and its
 * full list can't disagree about what they contain. Each Server Action they
 * call does its own requireAuth().
 */

export type ActivityWithOrganisation = {
  activity: OrganisationActivity
  organisationId: string
  organisationName: string
}

/**
 * Non-archived activity for the given organisations, most recently logged
 * first. Activity lives in a subcollection per organisation, so this is one
 * read per organisation (each capped at its latest 50 entries).
 */
export async function activityAcross(
  organisations: OrganisationListItem[]
): Promise<{ activity: ActivityWithOrganisation[]; failed: boolean }> {
  const results = await Promise.all(
    organisations.map((organisation) => listOrganisationActivities(organisation.id))
  )

  const activity = results.flatMap((result, index) => {
    const organisation = organisations[index]
    if (!result.data || !organisation) return []

    return result.data
      .filter((entry) => entry.deletedAt === null)
      .map((entry) => ({
        activity: entry,
        organisationId: organisation.id,
        organisationName: organisation.name,
      }))
  })

  return {
    activity: activity.sort((a, b) => b.activity.createdAt - a.activity.createdAt),
    failed: results.some((result) => !result.success),
  }
}

/** Meetings between `from` and `to` across every organisation, soonest first, with names. */
export async function meetingsAcross(
  organisations: OrganisationListItem[],
  from: number,
  to: number
): Promise<{ meetings: MeetingWithOrganisation[]; error: string | null }> {
  const names = new Map(organisations.map((organisation) => [organisation.id, organisation.name]))
  const result = await listUpcomingMeetings({ organisationIds: [...names.keys()], from, to })

  return {
    meetings: (result.data ?? []).map(({ organisationId, activity }) => ({
      organisationId,
      organisationName: names.get(organisationId) ?? 'Unknown organisation',
      activity,
    })),
    error: result.success ? null : (result.error ?? 'Failed to load meetings'),
  }
}

/** Organisations with a follow-up date, soonest (most overdue) first. */
export function followUpsOf(organisations: OrganisationListItem[]) {
  return organisations
    .filter(
      (organisation): organisation is OrganisationListItem & { nextActionDueAt: number } =>
        organisation.nextActionDueAt !== null
    )
    .sort((a, b) => a.nextActionDueAt - b.nextActionDueAt)
}
