'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { restoreOrganisation } from '@/features/organisations/actions/organisations.actions'
import { RETENTION_DAYS, purgeDateFor } from '@/features/organisations/retention'
import type { OrganisationListItem } from '@/features/organisations/types'

/**
 * Archived organisations, with the retention date each one is scheduled to be
 * removed on. Restoring clears deletedAt and returns the record to the list.
 */

function RestoreButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const restore = async () => {
    setPending(true)
    const result = await restoreOrganisation(id)
    setPending(false)

    if (!result.success) {
      toast.error(result.error ?? 'Failed to restore organisation')
      return
    }

    toast.success(`${name} restored`)
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={restore}
      disabled={pending}
      className="text-brand-600 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-zinc-50 disabled:opacity-60"
    >
      {pending ? 'Restoring...' : 'Restore'}
    </button>
  )
}

export function ArchivedOrganisationsTable({
  organisations,
}: {
  organisations: OrganisationListItem[]
}) {
  if (organisations.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Nothing archived"
          description="Archived organisations appear here and can be restored."
        />
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-100">
                {['Organisation', 'Type', 'Owner', 'Archived', 'Scheduled removal', ''].map(
                  (column, index) => (
                    <th
                      key={column || `actions-${index}`}
                      scope="col"
                      className="px-6 py-4 text-xs font-semibold text-zinc-500"
                    >
                      {column}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {organisations.map((organisation) => (
                <tr
                  key={organisation.id}
                  className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900">
                    {organisation.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{organisation.type}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">
                    {organisation.relationshipOwner}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {organisation.deletedAt ? formatRelativeTime(organisation.deletedAt) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {organisation.deletedAt
                      ? formatDate(purgeDateFor(organisation.deletedAt))
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <RestoreButton id={organisation.id} name={organisation.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-sm text-zinc-500">
        Archived organisations are kept for {RETENTION_DAYS} days. Nothing is removed automatically
        yet — see the retention note in the code.
      </p>
    </div>
  )
}
