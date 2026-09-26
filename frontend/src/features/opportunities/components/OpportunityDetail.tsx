'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AutoGrowTextarea } from '@/components/shared/AutoGrowTextarea'
import { Card } from '@/components/shared/Card'
import { inputClass, labelClass } from '@/components/shared/formClasses'
import {
  setOpportunityComplete,
  updateOpportunity,
} from '@/features/opportunities/actions/opportunities.actions'
import { OPPORTUNITY_TYPES } from '@/features/opportunities/constants'
import { PIPELINE_STAGES } from '@/features/organisations/constants'
import {
  opportunityFormSchema,
  toOpportunityFormValues,
  toOpportunityInput,
  type OpportunityFormValues,
} from '@/lib/validations/opportunity'
import { cn, formatDate } from '@/lib/utils'
import type { OpportunityListItem } from '@/features/opportunities/types'

/**
 * Opportunity detail — the editable panel beneath the table in the wireframe.
 *
 * Update Status saves the whole panel; Mark Complete records completion
 * without requiring the form to be valid first.
 */
export function OpportunityDetail({ opportunity }: { opportunity: OpportunityListItem }) {
  const router = useRouter()
  const complete = opportunity.completedAt !== null

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    // Keyed by id in the parent, so switching rows remounts with fresh values.
    defaultValues: toOpportunityFormValues(opportunity),
  })

  const onSubmit = handleSubmit(async (values) => {
    // organisationId is fixed after creation, so it is not sent on update.
    const { organisationId, ...rest } = toOpportunityInput(values)
    void organisationId
    const result = await updateOpportunity(opportunity.id, rest)

    if (!result.success) {
      toast.error(result.error ?? 'Failed to update opportunity')
      return
    }

    toast.success('Opportunity updated')
    router.refresh()
  })

  const toggleComplete = async () => {
    const result = await setOpportunityComplete(opportunity.id, !complete)

    if (!result.success) {
      toast.error(result.error ?? 'Failed to update opportunity')
      return
    }

    toast.success(complete ? 'Opportunity reopened' : 'Opportunity marked complete')
    router.refresh()
  }

  const field = (
    name: keyof OpportunityFormValues,
    label: string,
    options?: { long?: boolean; type?: string }
  ) => (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      {options?.long ? (
        <AutoGrowTextarea
          id={name}
          className={cn(inputClass, errors[name] && 'border-red-400')}
          registration={register(name)}
        />
      ) : (
        <input
          id={name}
          type={options?.type ?? 'text'}
          aria-invalid={errors[name] ? true : undefined}
          className={cn(inputClass, errors[name] && 'border-red-400')}
          {...register(name)}
        />
      )}
      {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]?.message}</p>}
    </div>
  )

  return (
    <Card title={`Opportunity Detail — ${opportunity.name}`} className="self-start">
      {complete && (
        <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Completed {formatDate(new Date(opportunity.completedAt!))}
        </p>
      )}

      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="type" className={labelClass}>
              Opportunity type
            </label>
            <select id="type" className={inputClass} {...register('type')}>
              {OPPORTUNITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="stage" className={labelClass}>
              Status / stage
            </label>
            <select id="stage" className={inputClass} {...register('stage')}>
              {PIPELINE_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>

          {field('owner', 'Assigned team member')}
          {field('nextStep', 'Expected next step')}
        </div>

        {field('proposalDocument', 'Proposal / supporting document', { type: 'url' })}
        {field('description', 'Description', { long: true })}
        {field('expectedOutcome', 'Partnership outcome (expected)', { long: true })}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void toggleComplete()}
            className="text-brand-600 rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-zinc-50"
          >
            {complete ? 'Reopen' : 'Mark Complete'}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Update Status'}
          </button>
        </div>
      </form>
    </Card>
  )
}
