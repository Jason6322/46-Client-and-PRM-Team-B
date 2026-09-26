import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { listOrganisations } from '@/features/organisations/actions/organisations.actions'
import { NewOpportunityForm } from '@/features/opportunities/components/NewOpportunityForm'

export const metadata: Metadata = {
  title: 'New Opportunity',
}

export default async function NewOpportunityPage() {
  const result = await listOrganisations()
  const organisations = (result.data ?? []).map(({ id, name }) => ({ id, name }))

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="New Opportunity" description="Fields marked * are required" />

      {organisations.length === 0 ? (
        <Card>
          <EmptyState
            title="No organisations yet"
            description="An opportunity belongs to an organisation, so add one first."
            action={
              <Link
                href="/organisations/new"
                className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                + Add Organisation
              </Link>
            }
          />
        </Card>
      ) : (
        <NewOpportunityForm organisations={organisations} />
      )}
    </div>
  )
}
