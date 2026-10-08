import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { listOrganisations } from '@/features/organisations/actions/organisations.actions'
import { SearchAndFilter } from '@/features/organisations/components/SearchAndFilter'
import { filtersFromParams } from '@/features/organisations/search'

export const metadata: Metadata = {
  title: 'Search & Filter',
}

/**
 * Search & Filter — reached from the search button in the top nav.
 *
 * The filters live in the query string, so the page reads them here to render
 * a shared or reloaded link with the same results.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [params, result] = await Promise.all([searchParams, listOrganisations()])
  const initialFilters = filtersFromParams(params)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Search & Filter"
        description="Find organisations, contacts and tags across the CRM"
      />

      {result.success && result.data ? (
        <SearchAndFilter organisations={result.data} initialFilters={initialFilters} />
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
