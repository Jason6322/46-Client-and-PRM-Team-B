import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  BackToDashboard,
  DetailFields,
  ExternalLink,
} from '@/features/dashboard/components/DetailList'
import { meetingsAcross } from '@/features/dashboard/data'
import { formatDateTimeIn } from '@/features/dashboard/format'
import { listOrganisations } from '@/features/organisations/actions/organisations.actions'
import { getViewerTimeZone } from '@/lib/viewerTimeZone'

export const metadata: Metadata = {
  title: 'Upcoming Meetings',
}

/** How far ahead the full list looks; the dashboard card covers the next 7 days. */
const LOOKAHEAD_DAYS = 90
const DAY_MS = 86_400_000

/** The window this page covers, read once per render. */
function lookahead() {
  const from = Date.now()
  return { from, to: from + LOOKAHEAD_DAYS * DAY_MS, nextWeek: from + 7 * DAY_MS }
}

/**
 * Every meeting booked in the next 90 days across all organisations, soonest
 * first, with the agenda, attendees and links — the full list behind the
 * dashboard's Upcoming Meetings card.
 */
export default async function UpcomingMeetingsPage() {
  const [organisationResult, timeZone] = await Promise.all([
    listOrganisations(),
    getViewerTimeZone(),
  ])
  const { from, to, nextWeek } = lookahead()
  const { meetings, error } = await meetingsAcross(organisationResult.data ?? [], from, to)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upcoming Meetings"
        description={`Meetings booked over the next ${LOOKAHEAD_DAYS} days across all organisations`}
        actions={<BackToDashboard />}
      />

      {(error || !organisationResult.success) && (
        <p className="text-sm text-red-600" role="alert">
          {error ?? 'Could not load organisations.'} Try refreshing the page.
        </p>
      )}

      {meetings.length === 0 ? (
        <Card>
          <EmptyState
            title="No meetings booked"
            description="Log a meeting with a future date from an organisation's Meetings page."
          />
        </Card>
      ) : (
        <Card className="p-0">
          <p className="border-b border-zinc-100 px-6 py-3 text-xs text-zinc-500">
            {meetings.length} {meetings.length === 1 ? 'meeting' : 'meetings'}
          </p>
          <ul>
            {meetings.map(({ activity, organisationId, organisationName }) => (
              <li key={activity.id} className="border-b border-zinc-50 px-6 py-4 last:border-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm font-semibold text-zinc-900">
                    {formatDateTimeIn(activity.occurredAt!, timeZone)}
                  </span>
                  {activity.occurredAt! <= nextWeek && (
                    <span className="bg-brand-50 text-brand-700 rounded px-2 py-0.5 text-xs font-semibold">
                      This week
                    </span>
                  )}
                  <Link
                    href={`/organisations/${organisationId}`}
                    className="hover:text-brand-600 text-sm font-medium text-zinc-700 transition-colors"
                  >
                    {organisationName}
                  </Link>
                  <Link
                    href={`/meetings/${organisationId}`}
                    className="text-brand-600 hover:text-brand-700 ml-auto text-xs font-semibold"
                  >
                    Open timeline
                  </Link>
                </div>

                <DetailFields
                  fields={[
                    ['Agenda', activity.agenda],
                    ['Attendees', activity.attendees],
                    ['Responsible', activity.responsible],
                    ['Notes', activity.notes],
                    [
                      'Meeting link',
                      activity.meetingLink && (
                        <ExternalLink href={activity.meetingLink}>Join meeting</ExternalLink>
                      ),
                    ],
                    [
                      'Documents',
                      activity.documentLinks.length > 0 && (
                        <span className="flex flex-col">
                          {activity.documentLinks.map((link) => (
                            <ExternalLink key={link} href={link} />
                          ))}
                        </span>
                      ),
                    ],
                    ['Booked by', activity.actorLabel],
                  ]}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
