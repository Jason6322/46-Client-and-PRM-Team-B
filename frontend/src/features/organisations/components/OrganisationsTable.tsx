'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatRelativeTime } from '@/lib/utils'
import type { OrganisationListItem } from '@/features/organisations/types'

/**
 * Organisations list — screen 3 of the approved prototype.
 *
 * The whole collection is fetched once on the server and filtered here in
 * memory. At the expected size that is far cheaper than re-querying Firestore
 * on every keystroke, and it keeps the search instant.
 */

const COLUMNS = [
  'Organisation',
  'Type',
  'Primary Contact',
  'Owner',
  'Pipeline Stage',
  'Tags',
  'Last Activity',
]

function matches(organisation: OrganisationListItem, term: string) {
  const haystack = [
    organisation.name,
    organisation.type,
    organisation.industry ?? '',
    organisation.country,
    organisation.relationshipOwner,
    organisation.pipelineStage,
    organisation.relationshipStatus ?? '',
    organisation.primaryContact.name,
    organisation.primaryContact.role ?? '',
    ...organisation.tags,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(term)
}

export function OrganisationsTable({ organisations }: { organisations: OrganisationListItem[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return organisations
    return organisations.filter((organisation) => matches(organisation, term))
  }, [organisations, search])

  /**
   * Row click is a convenience for the mouse only. The organisation name stays
   * a real link, so keyboard navigation, middle-click and "copy link address"
   * keep working — a row-level onClick alone would break all three.
   *
   * Ignored when the user was selecting text, so dragging across a row to copy
   * a value does not navigate away.
   */
  const openRow = (id: string) => {
    if (window.getSelection()?.toString()) return
    router.push(`/organisations/${id}`)
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, contact, or tag..."
          aria-label="Search organisations"
          className="focus:border-brand-500 focus:ring-brand-500/30 w-full rounded-lg border border-zinc-200 bg-white py-3 pr-4 pl-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:outline-none"
        />
      </div>

      <Card className="p-0">
        {filtered.length === 0 ? (
          <EmptyState
            title={organisations.length === 0 ? 'No organisations yet' : 'No matches'}
            description={
              organisations.length === 0
                ? 'Add an organisation and it will appear here.'
                : 'Try a different search term.'
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
                      {organisation.primaryContact.name}
                      {organisation.primaryContact.role && (
                        <span className="text-zinc-400"> — {organisation.primaryContact.role}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {organisation.relationshipOwner}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="text-brand-600">{organisation.pipelineStage}</span>
                      {organisation.relationshipStatus && (
                        <span className="text-zinc-500"> · {organisation.relationshipStatus}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {organisation.tags.length > 0 ? organisation.tags.join(', ') : '—'}
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
