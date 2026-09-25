'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { changePipelineStage } from '@/features/organisations/actions/organisations.actions'
import { PIPELINE_STAGES, type PipelineStage } from '@/features/organisations/constants'
import { cn } from '@/lib/utils'
import type { OrganisationListItem } from '@/features/organisations/types'

/**
 * Relationship pipeline — a column per stage, with cards dragged between them.
 *
 * The move is applied locally first so the card lands where it was dropped
 * straight away, then saved. A rejected save puts the card back and explains
 * why, rather than leaving the board showing something the database disagrees
 * with.
 *
 * Dragging is pointer-only, so each card also carries a stage select that is
 * hidden until focused — keyboard users move a card without a mouse.
 */

/** Remembered per browser; falling back to scrolling is harmless. */
const VIEW_KEY = 'pipeline-view'

function subscribeToStoredView(onChange: () => void) {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

function readStoredView() {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'fit'
  } catch {
    return false
  }
}

function Card({
  organisation,
  onMove,
  dragging,
  onDragStart,
  onDragEnd,
  compact,
}: {
  organisation: OrganisationListItem
  onMove: (stage: PipelineStage) => void
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  compact: boolean
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'cursor-grab rounded-lg border border-zinc-200 bg-white p-3 shadow-sm active:cursor-grabbing',
        dragging && 'opacity-40'
      )}
    >
      <Link
        href={`/organisations/${organisation.id}`}
        draggable={false}
        title={organisation.name}
        className={cn(
          'hover:text-brand-600 block font-semibold text-zinc-900 transition-colors',
          compact ? 'truncate text-xs' : 'text-sm'
        )}
      >
        {organisation.name}
      </Link>

      <p
        className={cn('mt-2 text-xs text-zinc-500', compact && 'truncate')}
        title={`Owner: ${organisation.relationshipOwner || '—'} · Next: ${organisation.nextAction ?? '—'}`}
      >
        Owner: {organisation.relationshipOwner || '—'} · Next: {organisation.nextAction ?? '—'}
      </p>

      <label className="sr-only focus-within:not-sr-only">
        <span className="sr-only">Move {organisation.name} to stage</span>
        <select
          value={organisation.pipelineStage}
          onChange={(event) => onMove(event.target.value as PipelineStage)}
          className="mt-2 w-full rounded-md border border-zinc-200 px-2 py-1 text-xs"
        >
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export function PipelineBoard({ organisations }: { organisations: OrganisationListItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState(organisations)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<PipelineStage | null>(null)
  // The stored preference is read through useSyncExternalStore so the server
  // renders the scrolling default and the browser swaps in the saved choice
  // without a hydration mismatch. The local override covers this tab's own
  // clicks, which do not fire a storage event.
  const [chosen, setChosen] = useState<boolean | null>(null)
  const stored = useSyncExternalStore(subscribeToStoredView, readStoredView, () => false)
  const fitToScreen = chosen ?? stored

  const chooseView = (fit: boolean) => {
    setChosen(fit)
    try {
      window.localStorage.setItem(VIEW_KEY, fit ? 'fit' : 'scroll')
    } catch {
      // Private mode or blocked storage — the choice just is not remembered.
    }
  }

  const move = async (id: string, stage: PipelineStage) => {
    const organisation = items.find((item) => item.id === id)
    if (!organisation || organisation.pipelineStage === stage) return

    const previous = organisation.pipelineStage
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, pipelineStage: stage } : item))
    )

    const result = await changePipelineStage(id, stage)

    if (!result.success) {
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, pipelineStage: previous } : item))
      )
      toast.error(result.error ?? 'Failed to move organisation')
      return
    }

    toast.success(`${organisation.name} moved to ${stage}`)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs font-medium text-zinc-500">View</span>
        <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5">
          {[
            { fit: false, label: 'Scroll' },
            { fit: true, label: 'Fit to screen' },
          ].map(({ fit, label }) => (
            <button
              key={label}
              type="button"
              aria-pressed={fitToScreen === fit}
              onClick={() => chooseView(fit)}
              className={cn(
                'rounded px-3 py-1.5 text-xs font-semibold transition-colors',
                fitToScreen === fit ? 'bg-brand-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          'pb-4',
          fitToScreen
            ? 'grid grid-cols-4 gap-2 md:grid-cols-6 xl:grid-cols-12'
            : 'flex gap-4 overflow-x-auto'
        )}
      >
        {PIPELINE_STAGES.map((stage) => {
          const inStage = items.filter((item) => item.pipelineStage === stage)

          return (
            <section
              key={stage}
              onDragOver={(event) => {
                event.preventDefault()
                setOverStage(stage)
              }}
              onDragLeave={() => setOverStage((current) => (current === stage ? null : current))}
              onDrop={(event) => {
                event.preventDefault()
                setOverStage(null)
                if (draggingId) void move(draggingId, stage)
              }}
              className={cn(
                'flex flex-col rounded-lg bg-zinc-100 transition-colors',
                fitToScreen ? 'min-w-0 p-2' : 'w-64 shrink-0 p-3',
                overStage === stage && 'ring-brand-500 bg-brand-50 ring-2'
              )}
            >
              <h2
                className={cn(
                  'font-semibold text-zinc-900',
                  fitToScreen ? 'truncate text-xs' : 'text-sm'
                )}
                title={stage}
              >
                {stage}
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">{inStage.length}</p>

              <div className={cn('mt-3 flex min-h-24 flex-col', fitToScreen ? 'gap-2' : 'gap-3')}>
                {inStage.map((organisation) => (
                  <Card
                    key={organisation.id}
                    organisation={organisation}
                    compact={fitToScreen}
                    dragging={draggingId === organisation.id}
                    onDragStart={() => setDraggingId(organisation.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onMove={(next) => void move(organisation.id, next)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
