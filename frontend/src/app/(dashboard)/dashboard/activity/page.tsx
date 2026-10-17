import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { PaginatedList } from '@/components/shared/Pagination'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  BackToDashboard,
  DetailFields,
  ExternalLink,
} from '@/features/dashboard/components/DetailList'
import { latestActivity } from '@/features/dashboard/data'
import { formatDateTimeIn } from '@/features/dashboard/format'
import { listOrganisations } from '@/features/organisations/actions/organisations.actions'
import {
  ACTIVITY_TYPE_CLASSES,
  LOGGED_ACTIVITY_TYPES,
  type LoggedActivityType,
} from '@/features/organisations/constants'
import { describeActivity, isLoggedActivity } from '@/features/organisations/types'
import { cn, formatRelativeTime } from '@/lib/utils'
import { getViewerTimeZone } from '@/lib/viewerTimeZone'

export const metadata: Metadata = {
  title: 'Recent Activity',
}

/**
 * The page lists the latest entries rather than the whole history: one
 * collection-group query costs about this many reads, where reading every
 * organisation's timeline would cost every activity in the CRM. Older entries
 * stay on each organisation's own timeline.
 */
const ACTIVITY_SHOWN = 100

const FILTERS = ['All', ...LOGGED_ACTIVITY_TYPES, 'Stage changes'] as const
type Filter = (typeof FILTERS)[number]

function filterFrom(value: string | string[] | undefined): Filter {
  return FILTERS.find((filter) => filter === value) ?? 'All'
}

/**
 * Every logged interaction and stage change across all organisations, most
 * recently recorded first — the full list behind the dashboard's Recent
 * Activity card, which shows only the latest five.
 */
export default async function RecentActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [params, organisationResult, timeZone] = await Promise.all([
    searchParams,
    listOrganisations(),
    getViewerTimeZone(),
  ])
  const filter = filterFrom(params.type)
  const { activity, failed } = await latestActivity(organisationResult.data ?? [], ACTIVITY_SHOWN)

  const shown = activity.filter(({ activity: entry }) =>
    filter === 'All'
      ? true
      : filter === 'Stage changes'
        ? entry.type === 'stage_change'
        : entry.type === filter
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recent Activity"
        description={`The latest ${ACTIVITY_SHOWN} meetings, calls, emails, notes and stage changes across all organisations — older ones are on each organisation's timeline`}
        actions={<BackToDashboard />}
      />

      <nav aria-label="Filter by type" className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <Link
            key={option}
            href={option === 'All' ? '/dashboard/activity' : `/dashboard/activity?type=${option}`}
            aria-current={option === filter ? 'page' : undefined}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              option === filter
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
            )}
          >
            {option}
          </Link>
        ))}
      </nav>

      {(!organisationResult.success || failed) && (
        <p className="text-sm text-red-600" role="alert">
          Some activity could not be loaded. Try refreshing the page.
        </p>
      )}

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            title={filter === 'All' ? 'No activity yet' : `No ${filter.toLowerCase()} yet`}
            description="Log a meeting, call, email or note from an organisation's Meetings page."
          />
        </Card>
      ) : (
        <Card className="p-0">
          <p className="border-b border-zinc-100 px-6 py-3 text-xs text-zinc-500">
            {shown.length} {shown.length === 1 ? 'entry' : 'entries'}
          </p>
          <PaginatedList
            storageKey="dashboard-activity"
            label="entries"
            paginationClassName="border-t border-zinc-100 px-6 py-3"
          >
            {shown.map(({ activity: entry, organisationId, organisationName }) => {
              const logged = isLoggedActivity(entry)
              return (
                <li key={entry.id} className="border-b border-zinc-50 px-6 py-4 last:border-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-xs font-semibold',
                        logged
                          ? ACTIVITY_TYPE_CLASSES[entry.type as LoggedActivityType]
                          : 'bg-zinc-100 text-zinc-600'
                      )}
                    >
                      {logged ? entry.type : 'Stage change'}
                    </span>
                    <Link
                      href={`/organisations/${organisationId}`}
                      className="hover:text-brand-600 text-sm font-semibold text-zinc-900 transition-colors"
                    >
                      {organisationName}
                    </Link>
                    <span className="text-xs text-zinc-500">
                      {formatRelativeTime(entry.createdAt)}
                    </span>
                    <Link
                      href={`/meetings/${organisationId}`}
                      className="text-brand-600 hover:text-brand-700 ml-auto text-xs font-semibold"
                    >
                      Open timeline
                    </Link>
                  </div>

                  <p className="mt-1.5 text-sm text-zinc-700">{describeActivity(entry)}</p>

                  <DetailFields
                    fields={[
                      ['When', entry.occurredAt && formatDateTimeIn(entry.occurredAt, timeZone)],
                      ['Responsible', entry.responsible],
                      ['Attendees', entry.attendees],
                      ['Agenda', entry.agenda],
                      ['Notes', entry.notes],
                      ['Outcome', entry.outcome],
                      ['Action items', entry.actionItems],
                      ['Next follow-up', entry.nextFollowUp],
                      [
                        'Meeting link',
                        entry.meetingLink && <ExternalLink href={entry.meetingLink} />,
                      ],
                      [
                        'Documents',
                        entry.documentLinks.length > 0 && (
                          <span className="flex flex-col">
                            {entry.documentLinks.map((link) => (
                              <ExternalLink key={link} href={link} />
                            ))}
                          </span>
                        ),
                      ],
                      [
                        'Recorded',
                        `${formatDateTimeIn(entry.createdAt, timeZone)}${
                          entry.actorLabel ? ` by ${entry.actorLabel}` : ''
                        }`,
                      ],
                    ]}
                  />
                </li>
              )
            })}
          </PaginatedList>
        </Card>
      )}
    </div>
  )
}
