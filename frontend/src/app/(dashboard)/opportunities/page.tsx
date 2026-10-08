import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { listOpportunities } from '@/features/opportunities/actions/opportunities.actions'
import { OpportunitiesTable } from '@/features/opportunities/components/OpportunitiesTable'

export const metadata: Metadata = {
  title: 'Opportunities',
}

/**
 * Opportunities — every open opportunity. Each one opens on its own page
 * (/opportunities/[id]) with its details and related activity.
 */
export default async function OpportunitiesPage() {
  const result = await listOpportunities()
  const opportunities = result.success && result.data ? result.data : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunities"
        description="Partnerships, projects and collaborations across all organisations"
        actions={
          <Link
            href="/opportunities/new"
            className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            + New Opportunity
          </Link>
        }
      />

      {!result.success ? (
        <Card>
          <EmptyState
            title="Could not load opportunities"
            description={result.error ?? 'Try refreshing the page.'}
          />
        </Card>
      ) : opportunities.length === 0 ? (
        <Card>
          <EmptyState
            title="No opportunities yet"
            description="Create one against an organisation and it will appear here."
            action={
              <Link
                href="/opportunities/new"
                className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                + New Opportunity
              </Link>
            }
          />
        </Card>
      ) : (
        <OpportunitiesTable opportunities={opportunities} />
      )}
    </div>
  )
}
