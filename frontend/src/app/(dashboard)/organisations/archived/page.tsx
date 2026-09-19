import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { listArchivedOrganisations } from '@/features/organisations/actions/organisations.actions'
import { ArchivedOrganisationsTable } from '@/features/organisations/components/ArchivedOrganisationsTable'
import { RETENTION_DAYS } from '@/features/organisations/retention'

export const metadata: Metadata = {
  title: 'Archived Organisations',
}

export default async function ArchivedOrganisationsPage() {
  const result = await listArchivedOrganisations()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Archived Organisations"
        description={`Archived records are kept for ${RETENTION_DAYS} days and can be restored`}
        actions={
          <Link
            href="/organisations"
            className="text-brand-600 rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-zinc-50"
          >
            Back to Organisations
          </Link>
        }
      />

      {result.success && result.data ? (
        <ArchivedOrganisationsTable organisations={result.data} />
      ) : (
        <Card>
          <EmptyState
            title="Could not load archived organisations"
            description={result.error ?? 'Try refreshing the page.'}
          />
        </Card>
      )}
    </div>
  )
}
