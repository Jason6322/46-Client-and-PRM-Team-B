'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm, type FieldError, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AutoGrowTextarea } from '@/components/shared/AutoGrowTextarea'
import { Card } from '@/components/shared/Card'
import { ORGANISATION_TYPES, RELATIONSHIP_STATUSES } from '@/features/organisations/constants'
import {
  createOrganisation,
  updateOrganisation,
} from '@/features/organisations/actions/organisations.actions'
import {
  organisationFormSchema,
  toCreateOrganisationInput,
  toOrganisationFormValues,
  type OrganisationFormValues,
} from '@/lib/validations/organisation'
import type { OrganisationListItem } from '@/features/organisations/types'
import { cn } from '@/lib/utils'

/**
 * Add Organisation form — screen 5 of the approved prototype.
 *
 * Validates against the same Zod definitions the Server Action uses, so the
 * browser and the server can never disagree about what is valid.
 */

const labelClass = 'block text-xs font-semibold tracking-wide text-zinc-500 uppercase'
const inputClass =
  'mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'

function Field({
  id,
  label,
  required,
  placeholder,
  type = 'text',
  registration,
  error,
}: {
  id: string
  label: string
  required?: boolean
  placeholder?: string
  type?: string
  registration: UseFormRegisterReturn
  error?: FieldError
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(inputClass, error && 'border-red-400 focus:border-red-500')}
        {...registration}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
          {error.message}
        </p>
      )}
    </div>
  )
}

export function OrganisationForm({ organisation }: { organisation?: OrganisationListItem }) {
  const router = useRouter()
  const isEdit = organisation !== undefined
  const [showSecondary, setShowSecondary] = useState(organisation?.secondaryContact != null)

  const {
    register,
    handleSubmit,
    unregister,
    formState: { errors, isSubmitting },
  } = useForm<OrganisationFormValues>({
    resolver: zodResolver(organisationFormSchema),
    defaultValues: organisation
      ? toOrganisationFormValues(organisation)
      : {
          name: '',
          industry: '',
          country: '',
          website: '',
          relationshipOwner: '',
          relationshipStatus: '',
          tags: '',
          notes: '',
          nextAction: '',
          nextActionDueAt: '',
          primaryContact: { name: '', role: '', email: '', phone: '' },
        },
  })

  const hideSecondary = () => {
    unregister('secondaryContact')
    setShowSecondary(false)
  }

  const onSubmit = handleSubmit(async (values) => {
    const payload = toCreateOrganisationInput(values)

    if (organisation) {
      const updated = await updateOrganisation(organisation.id, payload)

      if (!updated.success) {
        toast.error(updated.error ?? 'Failed to update organisation')
        return
      }

      toast.success(`${values.name.trim()} updated`)
      router.push(`/organisations/${organisation.id}`)
      router.refresh()
      return
    }

    const created = await createOrganisation(payload)

    if (!created.success || !created.data) {
      toast.error(created.error ?? 'Failed to create organisation')
      return
    }

    toast.success(`${values.name.trim()} added`)
    router.push(`/organisations/${created.data.id}`)
  })

  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      <Card title="Organisation Details">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="name"
            label="Organisation Name"
            required
            registration={register('name')}
            error={errors.name}
          />

          <div>
            <label htmlFor="type" className={labelClass}>
              Type <span aria-hidden="true">*</span>
            </label>
            <select
              id="type"
              defaultValue=""
              aria-invalid={errors.type ? true : undefined}
              className={cn(inputClass, errors.type && 'border-red-400')}
              {...register('type')}
            >
              <option value="" disabled>
                Select a type
              </option>
              {ORGANISATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.type && <p className="mt-1 text-xs text-red-600">{errors.type.message}</p>}
          </div>

          <Field
            id="industry"
            label="Industry / Sector"
            registration={register('industry')}
            error={errors.industry}
          />
          <Field
            id="country"
            label="Country"
            required
            registration={register('country')}
            error={errors.country}
          />
          <Field
            id="website"
            label="Website"
            type="url"
            placeholder="https://"
            registration={register('website')}
            error={errors.website}
          />
          <Field
            id="relationshipOwner"
            label="Relationship Owner"
            required
            placeholder="Assign team member"
            registration={register('relationshipOwner')}
            error={errors.relationshipOwner}
          />
        </div>

        <div className="mt-5 sm:w-1/2">
          <label htmlFor="relationshipStatus" className={labelClass}>
            Relationship Status
          </label>
          <select
            id="relationshipStatus"
            aria-invalid={errors.relationshipStatus ? true : undefined}
            className={cn(inputClass, errors.relationshipStatus && 'border-red-400')}
            {...register('relationshipStatus')}
          >
            <option value="">Not set</option>
            {RELATIONSHIP_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          {errors.relationshipStatus && (
            <p className="mt-1 text-xs text-red-600">{errors.relationshipStatus.message}</p>
          )}
        </div>

        <div className="mt-5">
          <Field
            id="tags"
            label="Tags"
            placeholder="Comma-separated"
            registration={register('tags')}
            error={errors.tags}
          />
        </div>

        <div className="mt-5">
          <p className={labelClass}>Pipeline Stage</p>
          <p className="mt-1.5 text-sm text-zinc-500">Prospect (default for new organisations)</p>
        </div>
      </Card>

      <Card>
        <fieldset>
          <legend className="mb-4 text-base font-semibold text-zinc-900">Primary Contact</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="primary-name"
              label="Name"
              required
              registration={register('primaryContact.name')}
              error={errors.primaryContact?.name}
            />
            <Field
              id="primary-role"
              label="Role / Position"
              registration={register('primaryContact.role')}
              error={errors.primaryContact?.role}
            />
            <Field
              id="primary-email"
              label="Email"
              type="email"
              registration={register('primaryContact.email')}
              error={errors.primaryContact?.email}
            />
            <Field
              id="primary-phone"
              label="Phone"
              type="tel"
              registration={register('primaryContact.phone')}
              error={errors.primaryContact?.phone}
            />
          </div>
        </fieldset>

        {showSecondary ? (
          <div className="mt-8 border-t border-zinc-100 pt-6">
            <fieldset>
              <legend className="mb-4 text-base font-semibold text-zinc-900">
                Secondary Contact
              </legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  id="secondary-name"
                  label="Name"
                  required
                  registration={register('secondaryContact.name')}
                  error={errors.secondaryContact?.name}
                />
                <Field
                  id="secondary-role"
                  label="Role / Position"
                  registration={register('secondaryContact.role')}
                  error={errors.secondaryContact?.role}
                />
                <Field
                  id="secondary-email"
                  label="Email"
                  type="email"
                  registration={register('secondaryContact.email')}
                  error={errors.secondaryContact?.email}
                />
                <Field
                  id="secondary-phone"
                  label="Phone"
                  type="tel"
                  registration={register('secondaryContact.phone')}
                  error={errors.secondaryContact?.phone}
                />
              </div>
            </fieldset>
            <button
              type="button"
              onClick={hideSecondary}
              className="mt-4 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800"
            >
              Remove secondary contact
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowSecondary(true)}
            className="text-brand-600 hover:border-brand-400 mt-6 rounded-md border border-zinc-200 px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            + Add Secondary Contact
          </button>
        )}
      </Card>

      <Card title="Follow-up">
        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          <Field
            id="nextAction"
            label="Next action"
            placeholder="e.g. Send revised partnership contract"
            registration={register('nextAction')}
            error={errors.nextAction}
          />
          <Field
            id="nextActionDueAt"
            label="Due"
            type="date"
            registration={register('nextActionDueAt')}
            error={errors.nextActionDueAt}
          />
        </div>
      </Card>

      <Card title="Notes">
        <label htmlFor="notes" className="sr-only">
          Notes
        </label>
        <AutoGrowTextarea
          id="notes"
          rows={4}
          className={inputClass}
          registration={register('notes')}
        />
      </Card>

      <div className="flex items-center gap-3">
        <Link
          href={organisation ? `/organisations/${organisation.id}` : '/organisations'}
          className="text-brand-600 rounded-md border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-zinc-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-brand-600 hover:bg-brand-700 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Organisation'}
        </button>
      </div>
    </form>
  )
}
