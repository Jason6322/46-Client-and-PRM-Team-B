'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AutoGrowTextarea } from '@/components/shared/AutoGrowTextarea'
import { Card } from '@/components/shared/Card'
import { saveRelationshipManagement } from '@/features/organisations/actions/organisations.actions'
import { nextPipelineStage } from '@/features/organisations/constants'
import {
  relationshipManagementFormSchema,
  toRelationshipManagementInput,
  type RelationshipManagementFormValues,
} from '@/lib/validations/organisation'
import { cn } from '@/lib/utils'
import type { OrganisationListItem } from '@/features/organisations/types'

/**
 * Relationship management — research, qualification, outreach and follow-up
 * for one organisation.
 *
 * "Recommended next action" writes to `nextAction` and "Assigned team member"
 * to `relationshipOwner`, the same fields the profile shows, so the two
 * screens can never disagree.
 */

const labelClass = 'block text-xs font-semibold tracking-wide text-zinc-500 uppercase'
const inputClass =
  'mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'

export function RelationshipManagementForm({
  organisation,
}: {
  organisation: OrganisationListItem
}) {
  const router = useRouter()
  const upcoming = nextPipelineStage(organisation.pipelineStage)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RelationshipManagementFormValues>({
    resolver: zodResolver(relationshipManagementFormSchema),
    defaultValues: {
      businessResearchNotes: organisation.businessResearchNotes ?? '',
      qualificationInfo: organisation.qualificationInfo ?? '',
      leadScore: organisation.leadScore === null ? '' : String(organisation.leadScore),
      researchStatus: organisation.researchStatus ?? '',
      businessBrief: organisation.businessBrief ?? '',
      outreachStatus: organisation.outreachStatus ?? '',
      communicationRecord: organisation.communicationRecord ?? '',
      followUpStatus: organisation.followUpStatus ?? '',
      relationshipNotes: organisation.relationshipNotes ?? '',
      relationshipOwner: organisation.relationshipOwner,
      nextAction: organisation.nextAction ?? '',
    },
  })

  const leadScore = watch('leadScore')
  const score = leadScore === '' ? null : Number(leadScore)

  const save = async (values: RelationshipManagementFormValues, advance: boolean) => {
    const result = await saveRelationshipManagement(
      organisation.id,
      toRelationshipManagementInput(values),
      advance
    )

    if (!result.success) {
      toast.error(result.error ?? 'Failed to save relationship details')
      return
    }

    toast.success(
      advance && result.data && result.data.pipelineStage !== organisation.pipelineStage
        ? `Saved and moved to ${result.data.pipelineStage}`
        : 'Relationship details saved'
    )
    router.refresh()
  }

  /** Free-text fields that can run long, so they grow instead of scrolling. */
  const notesField = (
    name: keyof RelationshipManagementFormValues,
    label: string,
    placeholder?: string
  ) => (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <AutoGrowTextarea
        id={name}
        placeholder={placeholder}
        aria-invalid={errors[name] ? true : undefined}
        className={cn(inputClass, errors[name] && 'border-red-400')}
        registration={register(name)}
      />
      {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]?.message}</p>}
    </div>
  )

  const field = (
    name: keyof RelationshipManagementFormValues,
    label: string,
    placeholder?: string
  ) => (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <input
        id={name}
        placeholder={placeholder}
        aria-invalid={errors[name] ? true : undefined}
        className={cn(inputClass, errors[name] && 'border-red-400')}
        {...register(name)}
      />
      {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]?.message}</p>}
    </div>
  )

  return (
    <form
      className="grid gap-6 lg:grid-cols-2"
      onSubmit={handleSubmit((values) => save(values, false))}
    >
      <Card title="Research" className="self-start">
        <div className="space-y-5">
          {notesField('businessResearchNotes', 'Business research notes')}
          {notesField('qualificationInfo', 'Qualification info')}

          <div>
            <div className="flex items-baseline justify-between gap-4">
              <label htmlFor="leadScore" className={labelClass}>
                Lead score
              </label>
              <span className="text-sm text-zinc-500">
                {score === null ? 'Not scored' : `${score} / 100`}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
              <div
                className="bg-brand-600 h-full rounded-full transition-all"
                style={{ width: `${score === null ? 0 : Math.min(score, 100)}%` }}
              />
            </div>
            <input
              id="leadScore"
              inputMode="numeric"
              placeholder="0-100"
              aria-invalid={errors.leadScore ? true : undefined}
              className={cn(inputClass, 'sm:w-32', errors.leadScore && 'border-red-400')}
              {...register('leadScore')}
            />
            {errors.leadScore && (
              <p className="mt-1 text-xs text-red-600">{errors.leadScore.message}</p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {field('researchStatus', 'Research status', 'e.g. Complete')}
            {field('businessBrief', 'Business brief', 'Link or reference')}
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <Card title="Outreach &amp; Follow-up">
          <div className="space-y-5">
            {field('outreachStatus', 'Outreach status', 'e.g. Contacted — awaiting response')}
            {notesField('communicationRecord', 'Communication record')}
            <div className="grid gap-5 sm:grid-cols-2">
              {field('followUpStatus', 'Follow-up status', 'e.g. Follow-up scheduled')}
              {field('nextAction', 'Recommended next action')}
            </div>
          </div>
        </Card>

        <Card title="Assignment &amp; Notes">
          <div className="grid gap-5 sm:grid-cols-2">
            {field('relationshipOwner', 'Assigned team member')}
            {notesField('relationshipNotes', 'Relationship notes')}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting || upcoming === null}
              onClick={handleSubmit((values) => save(values, true))}
              className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Save & Move to Next Stage'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-60"
            >
              Save
            </button>
            <p className="text-xs text-zinc-500">
              {upcoming === null
                ? `${organisation.pipelineStage} is the final stage`
                : `Currently ${organisation.pipelineStage} — next is ${upcoming}`}
            </p>
          </div>
        </Card>
      </div>
    </form>
  )
}
