'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/shared/Card'
import { ORGANISATION_TYPES } from '@/features/organisations/constants'

/**
 * Add Organisation form — screen 5 of the approved prototype.
 *
 * Layout and styling only. Nothing is submitted or validated yet; the only
 * behaviour is showing and hiding the optional secondary contact.
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
}: {
  id: string
  label: string
  required?: boolean
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      <input id={id} type={type} placeholder={placeholder} className={inputClass} />
    </div>
  )
}

function ContactFields({ prefix, legend }: { prefix: string; legend: string }) {
  return (
    <fieldset>
      <legend className="mb-4 text-base font-semibold text-zinc-900">{legend}</legend>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={`${prefix}-name`} label="Name" required />
        <Field id={`${prefix}-role`} label="Role / Position" />
        <Field id={`${prefix}-email`} label="Email" type="email" />
        <Field id={`${prefix}-phone`} label="Phone" type="tel" />
      </div>
    </fieldset>
  )
}

export function OrganisationForm() {
  const [showSecondary, setShowSecondary] = useState(false)

  return (
    <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
      <Card title="Organisation Details">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="name" label="Organisation Name" required />

          <div>
            <label htmlFor="type" className={labelClass}>
              Type <span aria-hidden="true">*</span>
            </label>
            <select id="type" defaultValue="" className={inputClass}>
              <option value="" disabled>
                Select a type
              </option>
              {ORGANISATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <Field id="industry" label="Industry / Sector" />
          <Field id="country" label="Country" required />
          <Field id="website" label="Website" type="url" placeholder="https://" />
          <Field
            id="relationshipOwner"
            label="Relationship Owner"
            required
            placeholder="Assign team member"
          />
        </div>

        <div className="mt-5">
          <Field id="tags" label="Tags" placeholder="Comma-separated" />
        </div>

        <div className="mt-5">
          <p className={labelClass}>Pipeline Stage</p>
          <p className="mt-1.5 text-sm text-zinc-500">Prospect (default for new organisations)</p>
        </div>
      </Card>

      <Card>
        <ContactFields prefix="primary" legend="Primary Contact" />

        {showSecondary ? (
          <div className="mt-8 border-t border-zinc-100 pt-6">
            <ContactFields prefix="secondary" legend="Secondary Contact" />
            <button
              type="button"
              onClick={() => setShowSecondary(false)}
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

      <Card title="Notes">
        <label htmlFor="notes" className="sr-only">
          Notes
        </label>
        <textarea id="notes" rows={4} className={inputClass} />
      </Card>

      <div className="flex items-center gap-3">
        <Link
          href="/organisations"
          className="text-brand-600 rounded-md border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-zinc-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          className="bg-brand-600 hover:bg-brand-700 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Save Organisation
        </button>
      </div>
    </form>
  )
}
