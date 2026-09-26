import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  getOrganisation,
  listOrganisationActivities,
} from '@/features/organisations/actions/organisations.actions'
import { listOpportunitiesForOrganisation } from '@/features/opportunities/actions/opportunities.actions'
import { ArchiveOrganisationButton } from '@/features/organisations/components/ArchiveOrganisationButton'
import { OrganisationDetail } from '@/features/organisations/components/OrganisationDetail'

export const metadata: Metadata = {
  title: 'Organisation',
}

export default async function OrganisationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getOrganisation(id)

  if (!result.success || !result.data) notFound()

  const organisation = result.data
  const activities = await listOrganisationActivities(id)
  const opportunities = await listOpportunitiesForOrganisation(id)

  return (
    <div className="space-y-6">
      <PageHeader
        title={organisation.name}
        actions={
          <>
            <ArchiveOrganisationButton id={organisation.id} name={organisation.name} />
            <Link
              href={`/organisations/${organisation.id}/edit`}
              className="text-brand-600 rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-zinc-50"
            >
              Edit Organisation
            </Link>
          </>
        }
      />
      <OrganisationDetail
        organisation={organisation}
        activities={activities.data ?? []}
        opportunities={opportunities.data ?? []}
      />
    </div>
  )
}
