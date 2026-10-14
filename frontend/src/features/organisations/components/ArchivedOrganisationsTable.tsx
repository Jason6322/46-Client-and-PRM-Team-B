'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, formatRelativeTime } from '@/lib/utils'
import {
  deleteOrganisationPermanently,
  restoreOrganisation,
} from '@/features/organisations/actions/organisations.actions'
import type { OrganisationListItem } from '@/features/organisations/types'

/**
 * Archived organisations. They are kept until someone deletes them here —
 * nothing is removed automatically. Restoring clears deletedAt and returns the
 * record to the list; deleting removes it for good.
 */

const secondaryButton =
  'rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-zinc-50 disabled:opacity-60'

/**
 * Confirmation for the permanent delete. It opens centred on the page rather
 * than in the row, so a double-click on "Delete permanently" can't land on the
 * confirm button, and the delete stays disabled until the name is typed.
 */
function ConfirmDeleteDialog({
  name,
  pending,
  onConfirm,
  onCancel,
}: {
  name: string
  pending: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const [typed, setTyped] = useState('')
  const matches = typed.trim() === name.trim()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [pending, onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-description"
        className="w-full max-w-md rounded-lg bg-white p-6 text-left shadow-xl"
      >
        <h2 id="confirm-delete-title" className="text-base font-semibold text-zinc-900">
          Delete {name} permanently?
        </h2>
        <p id="confirm-delete-description" className="mt-2 text-sm text-zinc-600">
          This removes the organisation, its activity history and its opportunities. It can&apos;t
          be undone.
        </p>

        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (matches && !pending) onConfirm()
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="confirm-delete-name" className="text-sm font-medium text-zinc-700">
              Type <span className="font-semibold text-zinc-900">{name}</span> to confirm
            </label>
            <input
              id="confirm-delete-name"
              autoFocus
              autoComplete="off"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              disabled={pending}
              className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className={cn(secondaryButton, 'text-zinc-600')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!matches || pending}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Deleting...' : 'Delete permanently'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [pending, setPending] = useState<'restore' | 'delete' | null>(null)
  const [confirming, setConfirming] = useState(false)
  const closeConfirm = useCallback(() => setConfirming(false), [])

  const restore = async () => {
    setPending('restore')
    const result = await restoreOrganisation(id)
    setPending(null)

    if (!result.success) {
      toast.error(result.error ?? 'Failed to restore organisation')
      return
    }

    toast.success(`${name} restored`)
    router.refresh()
  }

  const remove = async () => {
    setPending('delete')
    const result = await deleteOrganisationPermanently(id)
    setPending(null)

    if (!result.success) {
      toast.error(result.error ?? 'Failed to delete organisation')
      return
    }

    toast.success(`${name} permanently deleted`)
    setConfirming(false)
    router.refresh()
  }

  return (
    <span className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={restore}
        disabled={pending !== null}
        className={cn(secondaryButton, 'text-brand-600')}
      >
        {pending === 'restore' ? 'Restoring...' : 'Restore'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending !== null}
        className={cn(secondaryButton, 'text-red-600')}
      >
        Delete permanently
      </button>
      {confirming && (
        <ConfirmDeleteDialog
          name={name}
          pending={pending === 'delete'}
          onConfirm={remove}
          onCancel={closeConfirm}
        />
      )}
    </span>
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
                {['Organisation', 'Type', 'Archived', ''].map((column, index) => (
                  <th
                    key={column || `actions-${index}`}
                    scope="col"
                    className="px-6 py-4 text-xs font-semibold text-zinc-500"
                  >
                    {column}
                  </th>
                ))}
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
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {organisation.deletedAt ? formatRelativeTime(organisation.deletedAt) : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <RowActions id={organisation.id} name={organisation.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-sm text-zinc-500">
        Archived organisations are kept until you delete them. Deleting also removes their activity
        history and opportunities, and can&apos;t be undone.
      </p>
    </div>
  )
}
