import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  listArchivedOrganisations,
  listOrganisations,
} from '@/features/organisations/actions/organisations.actions'
import { ExistingOrganisationsPanel } from '@/features/organisations/components/ExistingOrganisationsPanel'
import { OrganisationForm } from '@/features/organisations/components/OrganisationForm'
import { getViewerTimeZone } from '@/lib/viewerTimeZone'

export const metadata: Metadata = {
  title: 'Add Organisation',
}

export default async function NewOrganisationPage() {
  const [active, archived, timeZone] = await Promise.all([
    listOrganisations(),
    listArchivedOrganisations(),
    getViewerTimeZone(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader title="Add Organisation" description="Fields marked * are required" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <OrganisationForm />
        {/* The panel is a convenience; the form still works if it fails to load. */}
        {active.success && active.data && (
          <ExistingOrganisationsPanel
            organisations={active.data}
            archivedCount={archived.data?.length ?? 0}
            timeZone={timeZone}
          />
        )}
      </div>
    </div>
  )
}
