import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { PaginatedList } from '@/components/shared/Pagination'
import { EmptyState } from '@/components/shared/EmptyState'
import { BackToDashboard, DetailFields } from '@/features/dashboard/components/DetailList'
import { followUpsOf } from '@/features/dashboard/data'
import { formatDayUtc } from '@/features/dashboard/format'
import { listOrganisations } from '@/features/organisations/actions/organisations.actions'
import { LeadPriorityBadge } from '@/features/organisations/components/LeadPriorityBadge'
import { describeDue, isDueToday, isOverdue } from '@/features/organisations/followUp'
import type { OrganisationListItem } from '@/features/organisations/types'
import { cn } from '@/lib/utils'
import { getViewerTimeZone } from '@/lib/viewerTimeZone'

export const metadata: Metadata = {
  title: 'Upcoming Follow-ups',
}

type FollowUp = OrganisationListItem & { nextActionDueAt: number }

function FollowUpList({
  title,
  followUps,
  timeZone,
  tone,
}: {
  title: string
  followUps: FollowUp[]
  timeZone: string | undefined
  tone: 'overdue' | 'today' | 'upcoming'
}) {
  if (followUps.length === 0) return null

  return (
    <Card className="p-0">
      <h2
        className={cn(
          'border-b border-zinc-100 px-6 py-3 text-sm font-semibold',
          tone === 'overdue' ? 'text-red-600' : 'text-zinc-900'
        )}
      >
        {title} <span className="font-normal text-zinc-500">({followUps.length})</span>
      </h2>
      <PaginatedList
        storageKey={`follow-ups-${tone}`}
        label="follow-ups"
        paginationClassName="border-t border-zinc-100 px-6 py-3"
      >
        {followUps.map((organisation) => {
          const contact = organisation.primaryContact
          return (
            <li key={organisation.id} className="border-b border-zinc-50 px-6 py-4 last:border-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link
                  href={`/organisations/${organisation.id}`}
                  className="hover:text-brand-600 text-sm font-semibold text-zinc-900 transition-colors"
                >
                  {organisation.name}
                </Link>
                <span
                  className={cn(
                    'text-xs font-semibold',
                    tone === 'overdue' ? 'text-red-600' : 'text-zinc-500'
                  )}
                >
                  {describeDue(organisation.nextActionDueAt, timeZone)}
                </span>
                {organisation.leadPriority && (
                  <LeadPriorityBadge priority={organisation.leadPriority} />
                )}
                <Link
                  href={`/relationships/${organisation.id}`}
                  className="text-brand-600 hover:text-brand-700 ml-auto text-xs font-semibold"
                >
                  Update follow-up
                </Link>
              </div>

              <DetailFields
                fields={[
                  ['Next action', organisation.nextAction],
                  ['Due', formatDayUtc(organisation.nextActionDueAt)],
                  ['Owner', organisation.relationshipOwner],
                  [
                    'Stage',
                    organisation.relationshipStatus
                      ? `${organisation.pipelineStage} · ${organisation.relationshipStatus}`
                      : organisation.pipelineStage,
                  ],
                  ['Follow-up status', organisation.followUpStatus],
                  [
                    'Primary contact',
                    [contact.name, contact.role, contact.email, contact.phone]
                      .filter(Boolean)
                      .join(' · '),
                  ],
                ]}
              />
            </li>
          )
        })}
      </PaginatedList>
    </Card>
  )
}

/**
 * Every organisation with a follow-up date, grouped into overdue, due today
 * and upcoming — the full list behind the dashboard's Upcoming Follow-ups card.
 */
export default async function UpcomingFollowUpsPage() {
  const [result, timeZone] = await Promise.all([listOrganisations(), getViewerTimeZone()])
  const followUps = followUpsOf(result.data ?? [])

  const overdue = followUps.filter((entry) => isOverdue(entry.nextActionDueAt, timeZone))
  const today = followUps.filter((entry) => isDueToday(entry.nextActionDueAt, timeZone))
  const upcoming = followUps.filter(
    (entry) =>
      !isOverdue(entry.nextActionDueAt, timeZone) && !isDueToday(entry.nextActionDueAt, timeZone)
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upcoming Follow-ups"
        description="Every organisation with a next action due, most urgent first"
        actions={<BackToDashboard />}
      />

      {!result.success ? (
        <Card>
          <EmptyState
            title="Could not load follow-ups"
            description={result.error ?? 'Try refreshing the page.'}
          />
        </Card>
      ) : followUps.length === 0 ? (
        <Card>
          <EmptyState
            title="No follow-ups scheduled"
            description="Set a next action and due date on an organisation's Relationships page."
          />
        </Card>
      ) : (
        <>
          <FollowUpList title="Overdue" followUps={overdue} timeZone={timeZone} tone="overdue" />
          <FollowUpList title="Due today" followUps={today} timeZone={timeZone} tone="today" />
          <FollowUpList title="Upcoming" followUps={upcoming} timeZone={timeZone} tone="upcoming" />
        </>
      )}
    </div>
  )
}
