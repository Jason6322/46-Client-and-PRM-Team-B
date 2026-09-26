import Link from 'next/link'
import { Card } from '@/components/shared/Card'
import { labelClass } from '@/components/shared/formClasses'
import {
  byOccurrence,
  isLoggedActivity,
  type OrganisationActivity,
} from '@/features/organisations/types'
import type { OrganisationListItem } from '@/features/organisations/types'
import { formatDate } from '@/lib/utils'

/**
 * Related Contacts, Meetings & Activities — the right-hand panel of the
 * opportunities wireframe.
 *
 * Everything here belongs to the opportunity's organisation rather than the
 * opportunity itself, so it is read-only and links back to the organisation.
 */
/** The time of this request. A Server Component renders once per request, so it is stable. */
function requestTime() {
  return Date.now()
}

export function RelatedToOpportunity({
  organisation,
  activities,
}: {
  organisation: OrganisationListItem | null
  activities: OrganisationActivity[]
}) {
  if (!organisation) {
    return (
      <Card title="Related Contacts, Meetings & Activities" className="self-start">
        <p className="text-sm text-zinc-400">
          The linked organisation could not be loaded. It may have been archived.
        </p>
      </Card>
    )
  }

  const { upcoming, past } = byOccurrence(
    activities.filter(isLoggedActivity).filter((entry) => entry.deletedAt === null),
    requestTime()
  )
  const logged = [...upcoming, ...past]
  const meetings = logged.filter((entry) => entry.type === 'Meeting')
  const others = logged.filter((entry) => entry.type !== 'Meeting')

  const line = (entry: OrganisationActivity) =>
    `${formatDate(new Date(entry.occurredAt ?? entry.createdAt))} — ${
      entry.notes ?? entry.agenda ?? entry.type
    }`

  return (
    <Card title="Related Contacts, Meetings & Activities" className="self-start">
      <div className="space-y-5">
        <div>
          <p className={labelClass}>Contacts</p>
          <p className="mt-1 text-sm text-zinc-900">
            {[organisation.primaryContact.name, organisation.primaryContact.role]
              .filter(Boolean)
              .join(' — ')}{' '}
            <span className="text-zinc-500">(primary)</span>
          </p>
          {organisation.secondaryContact && (
            <p className="mt-1 text-sm text-zinc-900">
              {[organisation.secondaryContact.name, organisation.secondaryContact.role]
                .filter(Boolean)
                .join(' — ')}{' '}
              <span className="text-zinc-500">(secondary)</span>
            </p>
          )}
        </div>

        <div>
          <p className={labelClass}>Meetings</p>
          {meetings.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-400">None logged</p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm text-zinc-700">
              {meetings.slice(0, 5).map((entry) => (
                <li key={entry.id}>{line(entry)}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className={labelClass}>Activity</p>
          {others.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-400">None logged</p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm text-zinc-700">
              {others.slice(0, 5).map((entry) => (
                <li key={entry.id}>{line(entry)}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-zinc-100 pt-4 text-sm font-semibold">
          <Link
            href={`/organisations/${organisation.id}`}
            className="text-brand-600 hover:text-brand-700 transition-colors"
          >
            View {organisation.name}
          </Link>
          <Link
            href={`/meetings/${organisation.id}`}
            className="text-brand-600 hover:text-brand-700 transition-colors"
          >
            Log an activity
          </Link>
        </div>
      </div>
    </Card>
  )
}
