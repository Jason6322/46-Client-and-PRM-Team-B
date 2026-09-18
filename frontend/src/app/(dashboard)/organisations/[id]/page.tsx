import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { OrganisationDetail } from '@/features/organisations/components/OrganisationDetail'

export const metadata: Metadata = {
  title: 'Organisation',
}

/**
 * The heading shows a generic label until the organisation is loaded — the
 * prototype shows the organisation's name here.
 */
export default function OrganisationDetailPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisation"
        actions={
          <button
            type="button"
            className="text-brand-600 rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-zinc-50"
          >
            Edit Organisation
          </button>
        }
      />
      <OrganisationDetail />
    </div>
  )
}
