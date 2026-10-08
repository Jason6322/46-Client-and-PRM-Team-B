import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { getOpportunity } from '@/features/opportunities/actions/opportunities.actions'
import { OpportunityDetail } from '@/features/opportunities/components/OpportunityDetail'
import { RelatedToOpportunity } from '@/features/opportunities/components/RelatedToOpportunity'
import {
  getOrganisation,
  listOrganisationActivities,
} from '@/features/organisations/actions/organisations.actions'

export const metadata: Metadata = {
  title: 'Opportunity',
}

/**
 * One opportunity — its details beside the organisation's contacts, meetings
 * and activity. Its own page, like Edit Organisation, rather than a panel
 * under the Opportunities table.
 */
export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getOpportunity(id)

  if (!result.success || !result.data) notFound()

  const opportunity = result.data
  const [organisation, activities] = await Promise.all([
    getOrganisation(opportunity.organisationId),
    listOrganisationActivities(opportunity.organisationId),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title={opportunity.name}
        description={`${opportunity.organisationName} · ${opportunity.stage}`}
        actions={
          <Link
            href="/opportunities"
            className="text-brand-600 rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-zinc-50"
          >
            Back to Opportunities
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <OpportunityDetail opportunity={opportunity} />
        <RelatedToOpportunity
          organisation={organisation.data ?? null}
          activities={activities.data ?? []}
        />
      </div>
    </div>
  )
}
