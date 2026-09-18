'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { archiveOrganisation } from '@/features/organisations/actions/organisations.actions'

/**
 * Archive action for the organisation detail screen.
 *
 * Archiving is a soft delete — the record is kept and can be restored — but it
 * disappears from every list, so it asks for confirmation inline rather than
 * firing on the first click.
 */
export function ArchiveOrganisationButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)

  const archive = async () => {
    setPending(true)
    const result = await archiveOrganisation(id)
    setPending(false)

    if (!result.success) {
      toast.error(result.error ?? 'Failed to archive organisation')
      return
    }

    toast.success(`${name} archived`)
    router.push('/organisations')
    router.refresh()
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
      >
        Archive
      </button>
    )
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={archive}
        disabled={pending}
        className="rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? 'Archiving...' : 'Confirm archive'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
      >
        Cancel
      </button>
    </span>
  )
}
