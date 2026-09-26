import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { listOrganisations } from '@/features/organisations/actions/organisations.actions'
import { PIPELINE_STAGES } from '@/features/organisations/constants'
import { isDueToday, isOverdue } from '@/features/organisations/followUp'
import { formatRelativeTime } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Dashboard',
}

/**
 * CRM dashboard — screen 1 of the approved prototype.
 *
 * Everything here is derived from the organisations collection. Opportunities
 * and meetings have no data source yet, so those panels say so rather than
 * showing a zero that looks like a real count.
 */
export default async function DashboardPage() {
  const result = await listOrganisations()
  const organisations = result.success && result.data ? result.data : []

  const withFollowUp = organisations.filter((organisation) => organisation.nextActionDueAt !== null)
  const overdue = withFollowUp.filter((organisation) => isOverdue(organisation.nextActionDueAt!))
  const dueToday = withFollowUp.filter((organisation) => isDueToday(organisation.nextActionDueAt!))

  const byStage = PIPELINE_STAGES.map((stage) => ({
    stage,
    count: organisations.filter((organisation) => organisation.pipelineStage === stage).length,
  }))
  const busiestStage = Math.max(1, ...byStage.map((entry) => entry.count))

  const recentlyUpdated = [...organisations]
    .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
    .slice(0, 5)

  const upcomingFollowUps = [...withFollowUp]
    .sort((a, b) => a.nextActionDueAt! - b.nextActionDueAt!)
    .slice(0, 5)

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

      {!result.success && (
        <Card>
          <EmptyState
            title="Could not load organisations"
            description={result.error ?? 'Try refreshing the page.'}
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
          <p className="text-2xl font-normal text-zinc-400">—</p>
          <p className="mt-1 text-sm text-zinc-500">Active Opportunities</p>
        </Card>

        <Card className="p-5">
          <p className="text-2xl font-normal text-zinc-400">—</p>
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
          <Card title="Recently Updated">
            {recentlyUpdated.length === 0 ? (
              <EmptyState title="No activity yet" />
            ) : (
              <ul className="space-y-3">
                {recentlyUpdated.map((organisation) => (
                  <li key={organisation.id} className="text-sm">
                    <Link
                      href={`/organisations/${organisation.id}`}
                      className="hover:text-brand-600 font-medium text-zinc-900 transition-colors"
                    >
                      {organisation.name}
                    </Link>
                    <span className="text-zinc-500">
                      {' '}
                      — {organisation.pipelineStage} ·{' '}
                      {formatRelativeTime(organisation.lastActivityAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Upcoming Follow-ups">
            {upcomingFollowUps.length === 0 ? (
              <EmptyState title="No follow-ups scheduled" />
            ) : (
              <ul className="space-y-3">
                {upcomingFollowUps.map((organisation) => (
                  <li key={organisation.id} className="text-sm">
                    <Link
                      href={`/organisations/${organisation.id}`}
                      className="hover:text-brand-600 font-medium text-zinc-900 transition-colors"
                    >
                      {organisation.name}
                    </Link>
                    <span
                      className={
                        isOverdue(organisation.nextActionDueAt!) ? 'text-red-600' : 'text-zinc-500'
                      }
                    >
                      {' '}
                      — {formatRelativeTime(organisation.nextActionDueAt!)}
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

      <Card title="Active Partnership Opportunities">
        <EmptyState
          title="Opportunities are not built yet"
          description="This panel will fill in once the opportunities screen exists."
        />
      </Card>
    </div>
  )
}
