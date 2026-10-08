'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, formatRelativeTime } from '@/lib/utils'
import {
  ORGANISATION_TYPES,
  PIPELINE_STAGES,
  RELATIONSHIP_STATUSES,
} from '@/features/organisations/constants'
import { EMPTY_FILTERS, type SearchFilters } from '@/features/organisations/search'
import type { OrganisationListItem } from '@/features/organisations/types'

/**
 * Search & Filter — the v2 prototype's search screen.
 *
 * Like the Organisations list, the collection is fetched once on the server and
 * filtered here in memory. The search and filters are mirrored into the URL so
 * a filtered view survives a reload and can be shared.
 */

const COLUMNS = ['Organisation', 'Type', 'Industry', 'Country', 'Stage', 'Last Activity']

/** Sorted distinct non-empty values, for the filters built from the data. */
function distinct(values: (string | null)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))].sort(
    (a, b) => a.localeCompare(b)
  )
}

/** Text search across the organisation, both contacts and the tags. */
function matchesText(organisation: OrganisationListItem, term: string) {
  const contacts = [organisation.primaryContact, organisation.secondaryContact].flatMap(
    (contact) => (contact ? [contact.name, contact.role ?? '', contact.email ?? ''] : [])
  )

  return [
    organisation.name,
    organisation.industry ?? '',
    organisation.country,
    ...contacts,
    ...organisation.tags,
  ]
    .join(' ')
    .toLowerCase()
    .includes(term)
}

function matchesFilters(organisation: OrganisationListItem, filters: SearchFilters) {
  const term = filters.q.trim().toLowerCase()
  return (
    (!term || matchesText(organisation, term)) &&
    (!filters.industry || organisation.industry === filters.industry) &&
    (!filters.country || organisation.country === filters.country) &&
    (!filters.status || organisation.relationshipStatus === filters.status) &&
    (!filters.stage || organisation.pipelineStage === filters.stage) &&
    (!filters.tag || organisation.tags.includes(filters.tag)) &&
    (!filters.type || organisation.type === filters.type)
  )
}

/** Replace the query string without a server round trip. */
function writeToUrl(filters: SearchFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  const query = params.toString()
  window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname)
}

const selectClass =
  'rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'

export function SearchAndFilter({
  organisations,
  initialFilters,
}: {
  organisations: OrganisationListItem[]
  initialFilters: SearchFilters
}) {
  const router = useRouter()
  const [filters, setFilters] = useState(initialFilters)

  const update = (key: keyof SearchFilters, value: string) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    writeToUrl(next)
  }

  const clear = () => {
    setFilters(EMPTY_FILTERS)
    writeToUrl(EMPTY_FILTERS)
  }

  const options = useMemo(
    () => ({
      industry: distinct(organisations.map((organisation) => organisation.industry)),
      country: distinct(organisations.map((organisation) => organisation.country)),
      tag: distinct(organisations.flatMap((organisation) => organisation.tags)),
    }),
    [organisations]
  )

  const filtered = useMemo(
    () => organisations.filter((organisation) => matchesFilters(organisation, filters)),
    [organisations, filters]
  )

  const dropdowns: { key: keyof SearchFilters; label: string; values: readonly string[] }[] = [
    { key: 'industry', label: 'Industry', values: options.industry },
    { key: 'country', label: 'Country', values: options.country },
    { key: 'status', label: 'Relationship status', values: RELATIONSHIP_STATUSES },
    { key: 'stage', label: 'Pipeline stage', values: PIPELINE_STAGES },
    { key: 'tag', label: 'Tags', values: options.tag },
    { key: 'type', label: 'Org type', values: ORGANISATION_TYPES },
  ]

  const active = Object.values(filters).some(Boolean)

  /** Same row behaviour as the Organisations list: click opens, selection doesn't. */
  const openRow = (id: string) => {
    if (window.getSelection()?.toString()) return
    router.push(`/organisations/${id}`)
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-3xl">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filters.q}
            onChange={(event) => update('q', event.target.value)}
            placeholder="Search organisations, contacts, tags..."
            aria-label="Search organisations, contacts and tags"
            autoFocus
            className="focus:border-brand-500 focus:ring-brand-500/30 w-full rounded-md border border-zinc-200 bg-white py-2.5 pr-4 pl-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:outline-none"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {dropdowns.map(({ key, label, values }) => (
            <select
              key={key}
              value={filters[key]}
              onChange={(event) => update(key, event.target.value)}
              aria-label={label}
              className={cn(selectClass, filters[key] && 'border-brand-500 text-brand-700')}
            >
              <option value="">{label}</option>
              {values.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          ))}
          {active && (
            <button
              type="button"
              onClick={clear}
              className="text-brand-600 hover:text-brand-700 px-2 text-sm font-semibold transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </Card>

      <Card className="p-0">
        {filtered.length === 0 ? (
          <EmptyState
            title={organisations.length === 0 ? 'No organisations yet' : 'No matches'}
            description={
              organisations.length === 0
                ? 'Add an organisation and it will appear here.'
                : 'Try a different search term or clear a filter.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-4xl border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-100">
                  {COLUMNS.map((column) => (
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
                {filtered.map((organisation) => (
                  <tr
                    key={organisation.id}
                    onClick={() => openRow(organisation.id)}
                    className="cursor-pointer border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium">
                      <Link
                        href={`/organisations/${organisation.id}`}
                        className="hover:text-brand-600 text-zinc-900 transition-colors"
                      >
                        {organisation.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{organisation.type}</td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {organisation.industry ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{organisation.country}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="bg-brand-50 text-brand-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
                        {organisation.pipelineStage}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {formatRelativeTime(organisation.lastActivityAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {organisations.length > 0 && (
        <p className="text-sm text-zinc-500">
          Showing {filtered.length} of {organisations.length} organisation
          {organisations.length === 1 ? '' : 's'}
        </p>
      )}
    </div>
  )
}
