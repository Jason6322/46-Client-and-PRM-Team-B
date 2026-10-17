import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { SeeAllLink } from '@/features/dashboard/components/SeeAllLink'
import { followUpsOf, latestActivity, meetingsAcross } from '@/features/dashboard/data'
import { formatDateTimeIn } from '@/features/dashboard/format'
import { listOpportunities } from '@/features/opportunities/actions/opportunities.actions'
import { listOrganisations } from '@/features/organisations/actions/organisations.actions'
import { PIPELINE_STAGES } from '@/features/organisations/constants'
import { describeDue, isDueToday, isOverdue } from '@/features/organisations/followUp'
import { describeActivity } from '@/features/organisations/types'
import { formatRelativeTime } from '@/lib/utils'
import { getViewerTimeZone } from '@/lib/viewerTimeZone'

export const metadata: Metadata = {
  title: 'Dashboard',
}

/** How many entries the Recent Activity card shows. */
const RECENT_ACTIVITY_COUNT = 5
const SEVEN_DAYS_MS = 7 * 86_400_000

/** The window "Meetings (next 7 days)" covers, read once per render. */
function nextSevenDays() {
  const from = Date.now()
  return { from, to: from + SEVEN_DAYS_MS }
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

  // Both are single collection-group queries across every organisation's
  // activities, so they cost what they return rather than one query per
  // organisation (see listRecentActivity and listUpcomingMeetings).
  const { from, to } = nextSevenDays()
  const [{ activity: recentActivity }, { meetings: upcomingMeetings }] = await Promise.all([
    latestActivity(organisations, RECENT_ACTIVITY_COUNT),
    meetingsAcross(organisations, from, to),
  ])

  const withFollowUp = followUpsOf(organisations)
  const overdue = withFollowUp.filter((organisation) =>
    isOverdue(organisation.nextActionDueAt, timeZone)
  )
  const dueToday = withFollowUp.filter((organisation) =>
    isDueToday(organisation.nextActionDueAt, timeZone)
  )

  const byStage = PIPELINE_STAGES.map((stage) => ({
    stage,
    count: organisations.filter((organisation) => organisation.pipelineStage === stage).length,
  }))
  const busiestStage = Math.max(1, ...byStage.map((entry) => entry.count))

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
        <Card
          title="Relationships by Pipeline Stage"
          className="lg:col-span-2"
          action={<SeeAllLink href="/pipeline" label="organisations by pipeline stage" />}
        >
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
          <Card
            title="Recent Activity"
            action={<SeeAllLink href="/dashboard/activity" label="recent activity" />}
          >
            {recentActivity.length === 0 ? (
              <EmptyState title="No activity yet" />
            ) : (
              <ul className="space-y-3">
                {recentActivity.map(({ activity, organisationId, organisationName }) => (
                  <li key={activity.id} className="text-sm">
                    <span className="text-zinc-700">{describeActivity(activity)}</span>
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

          <Card
            title="Upcoming Meetings"
            action={<SeeAllLink href="/dashboard/meetings" label="upcoming meetings" />}
          >
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
                        {formatDateTimeIn(activity.occurredAt!, timeZone)}
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

          <Card
            title="Upcoming Follow-ups"
            action={<SeeAllLink href="/dashboard/follow-ups" label="upcoming follow-ups" />}
          >
            {withFollowUp.length === 0 ? (
              <EmptyState title="No follow-ups scheduled" />
            ) : (
              <ul className="space-y-3">
                {withFollowUp.slice(0, 5).map((organisation) => (
                  <li key={organisation.id} className="text-sm">
                    <Link
                      href={`/organisations/${organisation.id}`}
                      className="hover:text-brand-600 font-medium text-zinc-900 transition-colors"
                    >
                      {organisation.name}
                    </Link>
                    <span
                      className={
                        isOverdue(organisation.nextActionDueAt, timeZone)
                          ? 'text-red-600'
                          : 'text-zinc-500'
                      }
                    >
                      {' '}
                      — {describeDue(organisation.nextActionDueAt, timeZone)}
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

      <Card
        title="Active Partnership Opportunities"
        action={<SeeAllLink href="/dashboard/opportunities" label="active opportunities" />}
      >
        {openOpportunities.length === 0 ? (
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
        ) : (
          // Bleeds to the card's edges so the rows line up with the header padding.
          <div className="-mx-6 -mb-6 overflow-x-auto">
            <table className="w-full min-w-3xl border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-100">
                  {['Opportunity', 'Organisation', 'Stage', 'Next Step'].map((column) => (
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
                        href={`/opportunities/${opportunity.id}`}
                        className="hover:text-brand-600 text-zinc-900 transition-colors"
                      >
                        {opportunity.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {opportunity.organisationName}
                    </td>
                    <td className="text-brand-600 px-6 py-4 text-sm">{opportunity.stage}</td>
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
