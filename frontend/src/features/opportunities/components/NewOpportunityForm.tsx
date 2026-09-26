'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AutoGrowTextarea } from '@/components/shared/AutoGrowTextarea'
import { Card } from '@/components/shared/Card'
import { inputClass, labelClass } from '@/components/shared/formClasses'
import { createOpportunity } from '@/features/opportunities/actions/opportunities.actions'
import { OPPORTUNITY_TYPES } from '@/features/opportunities/constants'
import { DEFAULT_PIPELINE_STAGE, PIPELINE_STAGES } from '@/features/organisations/constants'
import {
  opportunityFormSchema,
  toOpportunityInput,
  type OpportunityFormValues,
} from '@/lib/validations/opportunity'
import { cn } from '@/lib/utils'

/** The organisations an opportunity can be raised against. */
export interface OrganisationChoice {
  id: string
  name: string
}

export function NewOpportunityForm({ organisations }: { organisations: OrganisationChoice[] }) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: {
      name: '',
      organisationId: organisations[0]?.id ?? '',
      type: 'Partnership',
      stage: DEFAULT_PIPELINE_STAGE,
      owner: '',
      nextStep: '',
      proposalDocument: '',
      description: '',
      expectedOutcome: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = await createOpportunity(toOpportunityInput(values))

    if (!result.success || !result.data) {
      toast.error(result.error ?? 'Failed to create opportunity')
      return
    }

    toast.success(`${values.name.trim()} created`)
    router.push(`/opportunities?selected=${result.data.id}`)
  })

  const field = (
    name: keyof OpportunityFormValues,
    label: string,
    options?: { long?: boolean; type?: string; required?: boolean }
  ) => (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label} {options?.required && <span aria-hidden="true">*</span>}
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
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      <Card title="Opportunity Details">
        <div className="grid gap-5 sm:grid-cols-2">
          {field('name', 'Opportunity name', { required: true })}

          <div>
            <label htmlFor="organisationId" className={labelClass}>
              Organisation <span aria-hidden="true">*</span>
            </label>
            <select
              id="organisationId"
              className={cn(inputClass, errors.organisationId && 'border-red-400')}
              {...register('organisationId')}
            >
              {organisations.map((organisation) => (
                <option key={organisation.id} value={organisation.id}>
                  {organisation.name}
                </option>
              ))}
            </select>
            {errors.organisationId && (
              <p className="mt-1 text-xs text-red-600">{errors.organisationId.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="type" className={labelClass}>
              Type <span aria-hidden="true">*</span>
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

          {field('owner', 'Assigned team member', { required: true })}
          {field('nextStep', 'Expected next step')}
        </div>

        <div className="mt-5 space-y-5">
          {field('proposalDocument', 'Proposal / supporting document', { type: 'url' })}
          {field('description', 'Description', { long: true })}
          {field('expectedOutcome', 'Partnership outcome (expected)', { long: true })}
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Link
          href="/opportunities"
          className="text-brand-600 rounded-md border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-zinc-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-brand-600 hover:bg-brand-700 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Save Opportunity'}
        </button>
      </div>
    </form>
  )
}
