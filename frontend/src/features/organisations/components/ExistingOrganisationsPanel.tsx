import Link from 'next/link'
import { Card } from '@/components/shared/Card'
import { ORGANISATION_TYPES } from '@/features/organisations/constants'
import type { OrganisationListItem } from '@/features/organisations/types'

/**
 * Existing organisations — the panel beside the Add Organisation form.
 *
 * There to catch duplicates before they are created: the totals, the split by
 * type and the most recently active records, at a glance.
 */

const RECENT_LIMIT = 5

/** "2026-09" for a moment, in `timeZone`. */
function monthOf(millis: number, timeZone?: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).format(
    millis
  )
}

/** How many were created in the current calendar month, in `timeZone`. */
function countAddedThisMonth(organisations: OrganisationListItem[], timeZone?: string) {
  const thisMonth = monthOf(Date.now(), timeZone)
  return organisations.filter(
    (organisation) => monthOf(organisation.createdAt, timeZone) === thisMonth
  ).length
}

export function ExistingOrganisationsPanel({
  organisations,
  archivedCount,
  timeZone,
}: {
  /** Active organisations, most recently active first. */
  organisations: OrganisationListItem[]
  archivedCount: number
  timeZone?: string
}) {
  const addedThisMonth = countAddedThisMonth(organisations, timeZone)

  const byType = ORGANISATION_TYPES.map((type) => ({
    type,
    count: organisations.filter((organisation) => organisation.type === type).length,
  }))
  const largestType = Math.max(1, ...byType.map((entry) => entry.count))

  const stats = [
    { label: 'Total organisations', value: organisations.length },
    { label: 'Added this month', value: addedThisMonth },
    { label: 'Archived', value: archivedCount },
  ]

  return (
    <Card className="self-start">
      <h2 className="text-base font-semibold text-zinc-900">Existing organisations</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Check this list before adding a new organisation to avoid duplicates.
      </p>

      <ul className="mt-4 grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <li key={stat.label} className="rounded-md bg-zinc-50 p-3">
            <p className="text-xl font-semibold text-zinc-900">{stat.value}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{stat.label}</p>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-xs font-semibold tracking-wide text-zinc-500 uppercase">By type</p>
      <ul className="mt-2 space-y-2">
        {byType.map(({ type, count }) => (
          <li key={type} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-sm text-zinc-700">{type}</span>
            <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
              <span
                className="bg-brand-600 h-full rounded-full"
                style={{ width: `${(count / largestType) * 100}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right text-sm font-medium text-zinc-900">
              {count}
            </span>
          </li>
        ))}
      </ul>

      {organisations.length > 0 && (
        <>
          <p className="mt-5 border-t border-zinc-100 pt-4 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Recently active
          </p>
          <ul className="mt-1 divide-y divide-zinc-100">
            {organisations.slice(0, RECENT_LIMIT).map((organisation) => (
              <li key={organisation.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={`/organisations/${organisation.id}`}
                    className="hover:text-brand-600 block truncate text-sm font-medium text-zinc-900 transition-colors"
                  >
                    {organisation.name}
                  </Link>
                  <p className="text-xs text-zinc-500">{organisation.type}</p>
                </div>
                <span className="bg-brand-50 text-brand-700 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {organisation.pipelineStage}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Link
        href="/organisations"
        className="text-brand-600 hover:text-brand-700 mt-4 inline-block text-sm font-semibold transition-colors"
      >
        View all organisations →
      </Link>
    </Card>
  )
}
