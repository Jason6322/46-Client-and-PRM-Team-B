'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { changePipelineStage } from '@/features/organisations/actions/organisations.actions'
import { PIPELINE_STAGES, type PipelineStage } from '@/features/organisations/constants'

/**
 * Pipeline stage control on the organisation detail screen.
 *
 * The stage updates on change rather than behind a save button — advancing a
 * relationship is the CRM's most frequent action. The displayed value moves
 * immediately and rolls back if the server rejects it.
 */
export function PipelineStageSelect({ id, stage }: { id: string; stage: PipelineStage }) {
  const router = useRouter()
  const [value, setValue] = useState<PipelineStage>(stage)
  const [pending, setPending] = useState(false)

  const change = async (next: PipelineStage) => {
    const previous = value

    setValue(next)
    setPending(true)
    const result = await changePipelineStage(id, next)
    setPending(false)

    if (!result.success) {
      setValue(previous)
      toast.error(result.error ?? 'Failed to change pipeline stage')
      return
    }

    toast.success(`Moved to ${next}`)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="pipeline-stage" className="sr-only">
        Pipeline stage
      </label>
      <select
        id="pipeline-stage"
        value={value}
        disabled={pending}
        onChange={(event) => change(event.target.value as PipelineStage)}
        className="bg-brand-600 hover:bg-brand-700 cursor-pointer rounded-full px-3 py-1 text-xs font-semibold text-white transition-colors disabled:opacity-60"
      >
        {PIPELINE_STAGES.map((option) => (
          <option key={option} value={option} className="bg-white text-zinc-900">
            {option}
          </option>
        ))}
      </select>
      {pending && <span className="text-xs text-zinc-400">Saving...</span>}
    </div>
  )
}
