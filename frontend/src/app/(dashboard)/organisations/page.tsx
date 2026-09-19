import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { listOrganisations } from '@/features/organisations/actions/organisations.actions'
import { OrganisationsTable } from '@/features/organisations/components/OrganisationsTable'

export const metadata: Metadata = {
  title: 'Organisations',
}

/**
 * Organisations list — screen 3 of the approved prototype.
 *
 * Fetches the collection on the server and hands it to a Client Component,
 * which does the search filtering in memory.
 */
export default async function OrganisationsPage() {
  const result = await listOrganisations()

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
        <OrganisationsTable organisations={result.data} />
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
