import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { listOpportunities } from '@/features/opportunities/actions/opportunities.actions'
import { OpportunitiesTable } from '@/features/opportunities/components/OpportunitiesTable'
import { OpportunityDetail } from '@/features/opportunities/components/OpportunityDetail'
import { RelatedToOpportunity } from '@/features/opportunities/components/RelatedToOpportunity'
import {
  getOrganisation,
  listOrganisationActivities,
} from '@/features/organisations/actions/organisations.actions'

export const metadata: Metadata = {
  title: 'Opportunities',
}

/**
 * Opportunities — the table with the selected opportunity's detail and
 * related organisation information beneath it.
 *
 * The selection lives in the URL so it survives a reload and can be shared.
 * With nothing selected, the first opportunity is shown.
 */
export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>
}) {
  const { selected } = await searchParams
  const result = await listOpportunities()
  const opportunities = result.success && result.data ? result.data : []

  const current = opportunities.find((item) => item.id === selected) ?? opportunities[0] ?? null

  // The related panel belongs to the opportunity's organisation, so it is only
  // fetched once something is selected.
  const organisation = current ? await getOrganisation(current.organisationId) : null
  const activities = current ? await listOrganisationActivities(current.organisationId) : null

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
        <>
          <OpportunitiesTable opportunities={opportunities} selectedId={current?.id ?? null} />

          {current && (
            <div className="grid gap-6 lg:grid-cols-2">
              <OpportunityDetail key={current.id} opportunity={current} />
              <RelatedToOpportunity
                organisation={organisation?.data ?? null}
                activities={activities?.data ?? []}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
