'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { inputClass, labelClass } from '@/components/shared/formClasses'
import { setNextAction } from '@/features/organisations/actions/organisations.actions'
import { isDueToday, isOverdue, millisToDateOnly } from '@/features/organisations/followUp'
import { cn, formatDate } from '@/lib/utils'

/**
 * Follow-up / next action on the organisation profile — the "Next action" and
 * "Due" lines on the Pipeline Status card in the prototype.
 *
 * Read mode shows the follow-up with its due date, flagged when overdue or
 * due today. Edit mode saves through setNextAction without leaving the page.
 */

interface NextActionEditorProps {
  id: string
  nextAction: string | null
  nextActionDueAt: number | null
}

export function NextActionEditor({ id, nextAction, nextActionDueAt }: NextActionEditorProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [action, setAction] = useState(nextAction ?? '')
  const [due, setDue] = useState(nextActionDueAt === null ? '' : millisToDateOnly(nextActionDueAt))

  const startEditing = () => {
    setAction(nextAction ?? '')
    setDue(nextActionDueAt === null ? '' : millisToDateOnly(nextActionDueAt))
    setEditing(true)
  }

  const save = async (next: { nextAction: string; nextActionDueAt: string }) => {
    setPending(true)
    const result = await setNextAction(id, next)
    setPending(false)

    if (!result.success) {
      toast.error(result.error ?? 'Failed to save follow-up')
      return
    }

    toast.success(next.nextAction.trim() ? 'Follow-up saved' : 'Follow-up cleared')
    setEditing(false)
    router.refresh()
  }

  if (editing) {
    return (
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          void save({ nextAction: action, nextActionDueAt: due })
        }}
      >
        <div>
          <label htmlFor="next-action" className={labelClass}>
            Next action
          </label>
          <input
            id="next-action"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="e.g. Send revised partnership contract"
            maxLength={300}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="next-action-due" className={labelClass}>
            Due
          </label>
          <input
            id="next-action-due"
            type="date"
            value={due}
            onChange={(event) => setDue(event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="bg-brand-600 hover:bg-brand-700 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-60"
          >
            {pending ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={pending}
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </button>
          {nextAction && (
            <button
              type="button"
              onClick={() => void save({ nextAction: '', nextActionDueAt: '' })}
              disabled={pending}
              className="ml-auto text-xs font-medium text-zinc-500 transition-colors hover:text-red-600"
            >
              Clear follow-up
            </button>
          )}
        </div>
      </form>
    )
  }

  const overdue = nextActionDueAt !== null && isOverdue(nextActionDueAt)
  const dueToday = nextActionDueAt !== null && isDueToday(nextActionDueAt)

  return (
    <div className="mt-4">
      {nextAction ? (
        <>
          <p className="text-sm text-zinc-900">
            <span className="font-medium">Next action:</span> {nextAction}
          </p>
          {nextActionDueAt !== null && (
            <p
              className={cn(
                'mt-1 text-sm',
                overdue ? 'font-medium text-red-600' : dueToday ? 'text-amber-600' : 'text-zinc-500'
              )}
            >
              Due: {formatDate(new Date(nextActionDueAt))}
              {overdue && ' — overdue'}
              {dueToday && ' — today'}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-zinc-400">No follow-up set</p>
      )}
      <button
        type="button"
        onClick={startEditing}
        className="text-brand-600 hover:text-brand-700 mt-2 text-xs font-semibold transition-colors"
      >
        {nextAction ? 'Edit follow-up' : '+ Add follow-up'}
      </button>
    </div>
  )
}
