import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { listOpportunities } from '@/features/opportunities/actions/opportunities.actions'
import {
  listOrganisationActivities,
  listOrganisations,
} from '@/features/organisations/actions/organisations.actions'
import { PIPELINE_STAGES } from '@/features/organisations/constants'
import { describeDue, isDueToday, isOverdue } from '@/features/organisations/followUp'
import { isLoggedActivity, type OrganisationActivity } from '@/features/organisations/types'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { getViewerTimeZone } from '@/lib/viewerTimeZone'

export const metadata: Metadata = {
  title: 'Dashboard',
}

/** Activity panels only cover the most recently active organisations. */
const ACTIVITY_ORGANISATION_LIMIT = 10
const SEVEN_DAYS_MS = 7 * 86_400_000

/** The window "Meetings (next 7 days)" covers, read once per render. */
function nextSevenDays() {
  const from = Date.now()
  return { from, to: from + SEVEN_DAYS_MS }
}

type ActivityWithOrganisation = {
  activity: OrganisationActivity
  organisationId: string
  organisationName: string
}

/**
 * CRM dashboard — screen 1 of the approved prototype.
 *
 * Every panel is derived from the organisations, opportunities and activity
 * that already exist; nothing here is placeholder.
 */
export default async function DashboardPage() {
  // Independent reads, so they run together rather than one after the other.
  const [organisationResult, opportunityResult, timeZone] = await Promise.all([
    listOrganisations(),
    listOpportunities(),
    getViewerTimeZone(),
  ])

  const organisations = organisationResult.data ?? []
  const openOpportunities = (opportunityResult.data ?? []).filter(
    (opportunity) => opportunity.completedAt === null
  )

  // Activity lives in a subcollection per organisation. Reading every one
  // would cost a query per organisation, so this covers the most recently
  // active few — which is what these two panels are about anyway.
  const recentOrganisations = organisations.slice(0, ACTIVITY_ORGANISATION_LIMIT)
  const activityResults = await Promise.all(
    recentOrganisations.map((organisation) => listOrganisationActivities(organisation.id))
  )

  const allActivity: ActivityWithOrganisation[] = activityResults.flatMap((result, index) => {
    const organisation = recentOrganisations[index]
    if (!result.data || !organisation) return []

    return result.data
      .filter((activity) => activity.deletedAt === null)
      .map((activity) => ({
        activity,
        organisationId: organisation.id,
        organisationName: organisation.name,
      }))
  })

  const recentActivity = [...allActivity]
    .sort((a, b) => b.activity.createdAt - a.activity.createdAt)
    .slice(0, 5)

  const { from, to } = nextSevenDays()
  const upcomingMeetings = allActivity
    .filter(({ activity }) => {
      if (!isLoggedActivity(activity) || activity.type !== 'Meeting') return false
      const when = activity.occurredAt
      return when !== null && when >= from && when <= to
    })
    .sort((a, b) => (a.activity.occurredAt ?? 0) - (b.activity.occurredAt ?? 0))

  const withFollowUp = organisations.filter((organisation) => organisation.nextActionDueAt !== null)
  const overdue = withFollowUp.filter((organisation) =>
    isOverdue(organisation.nextActionDueAt!, timeZone)
  )
  const dueToday = withFollowUp.filter((organisation) =>
    isDueToday(organisation.nextActionDueAt!, timeZone)
  )

  const byStage = PIPELINE_STAGES.map((stage) => ({
    stage,
    count: organisations.filter((organisation) => organisation.pipelineStage === stage).length,
  }))
  const busiestStage = Math.max(1, ...byStage.map((entry) => entry.count))

  const describe = (activity: OrganisationActivity) => {
    if (!isLoggedActivity(activity)) {
      return activity.fromStage
        ? `Stage changed to ${activity.toStage}`
        : `Started at ${activity.toStage}`
    }
    return activity.notes ?? activity.agenda ?? `${activity.type} logged`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of relationship activity across all organisations"
        actions={
          <Link
            href="/organisations/new"
            className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            + Add Organisation
          </Link>
        }
      />

      {!organisationResult.success && (
        <Card>
          <EmptyState
            title="Could not load organisations"
            description={organisationResult.error ?? 'Try refreshing the page.'}
          />
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-brand-600 text-2xl font-semibold">{organisations.length}</p>
          <p className="mt-1 text-sm text-zinc-500">Active Organisations</p>
        </Card>

        <Card className="p-5">
          <p className="text-2xl font-semibold">
            <span className={overdue.length > 0 ? 'text-red-600' : 'text-zinc-900'}>
              {overdue.length} overdue
            </span>
            <span className="text-zinc-400"> / {withFollowUp.length} due</span>
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Follow-ups{dueToday.length > 0 && ` · ${dueToday.length} today`}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-brand-600 text-2xl font-semibold">{openOpportunities.length}</p>
          <p className="mt-1 text-sm text-zinc-500">Active Opportunities</p>
        </Card>

        <Card className="p-5">
          <p className="text-brand-600 text-2xl font-semibold">{upcomingMeetings.length}</p>
          <p className="mt-1 text-sm text-zinc-500">Meetings (next 7 days)</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Relationships by Pipeline Stage" className="lg:col-span-2">
          {organisations.length === 0 ? (
            <EmptyState title="No organisations yet" />
          ) : (
            <ul className="space-y-2">
              {byStage.map(({ stage, count }) => (
                <li key={stage} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-xs text-zinc-500">{stage}</span>
                  <span className="flex h-4 flex-1 items-center">
                    <span
                      className="bg-brand-600 h-2 rounded-full"
                      style={{ width: `${(count / busiestStage) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-right text-xs text-zinc-600">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Recent Activity">
            {recentActivity.length === 0 ? (
              <EmptyState title="No activity yet" />
            ) : (
              <ul className="space-y-3">
                {recentActivity.map(({ activity, organisationId, organisationName }) => (
                  <li key={activity.id} className="text-sm">
                    <span className="text-zinc-700">{describe(activity)}</span>
                    <span className="text-zinc-500"> — </span>
                    <Link
                      href={`/organisations/${organisationId}`}
                      className="hover:text-brand-600 font-medium text-zinc-900 transition-colors"
                    >
                      {organisationName}
                    </Link>
                    <span className="text-zinc-500">
                      {' '}
                      ({formatRelativeTime(activity.createdAt)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Upcoming Meetings">
            {upcomingMeetings.length === 0 ? (
              <EmptyState
                title="Nothing in the next 7 days"
                description="Meetings logged with a future date appear here."
              />
            ) : (
              <ul className="space-y-3">
                {upcomingMeetings
                  .slice(0, 5)
                  .map(({ activity, organisationId, organisationName }) => (
                    <li key={activity.id} className="text-sm">
                      <span className="text-zinc-700">
                        {formatDate(new Date(activity.occurredAt!))}
                      </span>
                      <span className="text-zinc-500"> — </span>
                      <Link
                        href={`/meetings/${organisationId}`}
                        className="hover:text-brand-600 font-medium text-zinc-900 transition-colors"
                      >
                        {organisationName}
                      </Link>
                      {activity.agenda && (
                        <p className="text-xs text-zinc-500">{activity.agenda}</p>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </Card>

          <Card title="Upcoming Follow-ups">
            {withFollowUp.length === 0 ? (
              <EmptyState title="No follow-ups scheduled" />
            ) : (
              <ul className="space-y-3">
                {[...withFollowUp]
                  .sort((a, b) => a.nextActionDueAt! - b.nextActionDueAt!)
                  .slice(0, 5)
                  .map((organisation) => (
                    <li key={organisation.id} className="text-sm">
                      <Link
                        href={`/organisations/${organisation.id}`}
                        className="hover:text-brand-600 font-medium text-zinc-900 transition-colors"
                      >
                        {organisation.name}
                      </Link>
                      <span
                        className={
                          isOverdue(organisation.nextActionDueAt!, timeZone)
                            ? 'text-red-600'
                            : 'text-zinc-500'
                        }
                      >
                        {' '}
                        — {describeDue(organisation.nextActionDueAt!, timeZone)}
                      </span>
                      {organisation.nextAction && (
                        <p className="text-xs text-zinc-500">{organisation.nextAction}</p>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card title="Active Partnership Opportunities" className="p-0">
        {openOpportunities.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No open opportunities"
              description="Raise one against an organisation and it will appear here."
              action={
                <Link
                  href="/opportunities/new"
                  className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  + New Opportunity
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-3xl border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-100">
                  {['Opportunity', 'Organisation', 'Stage', 'Owner', 'Next Step'].map((column) => (
                    <th
                      key={column}
                      scope="col"
                      className="px-6 py-4 text-xs font-semibold text-zinc-500"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {openOpportunities.slice(0, 8).map((opportunity) => (
                  <tr key={opportunity.id} className="border-b border-zinc-50 last:border-0">
                    <td className="px-6 py-4 text-sm font-medium">
                      <Link
                        href={`/opportunities?selected=${opportunity.id}`}
                        className="hover:text-brand-600 text-zinc-900 transition-colors"
                      >
                        {opportunity.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {opportunity.organisationName}
                    </td>
                    <td className="text-brand-600 px-6 py-4 text-sm">{opportunity.stage}</td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{opportunity.owner}</td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {opportunity.nextStep ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
