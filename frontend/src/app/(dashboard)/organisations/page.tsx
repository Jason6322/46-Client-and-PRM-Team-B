import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  listArchivedOrganisations,
  listOrganisations,
} from '@/features/organisations/actions/organisations.actions'
import { ExistingOrganisationsPanel } from '@/features/organisations/components/ExistingOrganisationsPanel'
import { OrganisationsTable } from '@/features/organisations/components/OrganisationsTable'
import { getViewerTimeZone } from '@/lib/viewerTimeZone'

export const metadata: Metadata = {
  title: 'Organisations',
}

/**
 * Organisations list — screen 3 of the approved prototype.
 *
 * Fetches the collection on the server and hands it to a Client Component,
 * which does the search filtering in memory. The List overview panel on the
 * right summarises the same records.
 */
export default async function OrganisationsPage() {
  const [result, archived, timeZone] = await Promise.all([
    listOrganisations(),
    listArchivedOrganisations(),
    getViewerTimeZone(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisations"
        description="Every organisation, contact and tag in the CRM"
        actions={
          <>
            <Link
              href="/organisations/archived"
              className="rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              Archived
            </Link>
            <Link
              href="/organisations/new"
              className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              + Add Organisation
            </Link>
          </>
        }
      />

      {result.success && result.data ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <OrganisationsTable organisations={result.data} />
          <ExistingOrganisationsPanel
            variant="list"
            organisations={result.data}
            archivedCount={archived.data?.length ?? 0}
            timeZone={timeZone}
          />
        </div>
      ) : (
        <Card>
          <EmptyState
            title="Could not load organisations"
            description={result.error ?? 'Try refreshing the page.'}
          />
        </Card>
      )}
    </div>
  )
}
