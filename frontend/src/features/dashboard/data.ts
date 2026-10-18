import 'server-only'
import {
  listRecentActivity,
  listUpcomingMeetings,
} from '@/features/organisations/actions/organisations.actions'
import type { MeetingWithOrganisation, OrganisationListItem } from '@/features/organisations/types'

/**
 * Reads shared by the dashboard and its "See all" pages, so a card and its
 * full list can't disagree about what they contain. Each Server Action they
 * call does its own requireAuth().
 */

/** An activity with the organisation it belongs to — the same shape as a meeting. */
export type ActivityWithOrganisation = MeetingWithOrganisation

/**
 * The latest `limit` non-archived activities across all active organisations,
 * most recently recorded first, with names from `organisations`. One
 * collection-group query (see listRecentActivity), so the cost follows
 * `limit`, not the number of organisations.
 */
export async function latestActivity(
  organisations: OrganisationListItem[],
  limit: number
): Promise<{ activity: ActivityWithOrganisation[]; failed: boolean }> {
  const names = new Map(organisations.map((organisation) => [organisation.id, organisation.name]))
  const result = await listRecentActivity({ limit })

  return {
    activity: (result.data ?? []).flatMap(({ organisationId, activity }) => {
      const organisationName = names.get(organisationId)
      return organisationName === undefined ? [] : [{ activity, organisationId, organisationName }]
    }),
    failed: !result.success,
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
