import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { getOrganisation } from '@/features/organisations/actions/organisations.actions'
import { LinkedOrganisationSummary } from '@/features/organisations/components/LinkedOrganisationSummary'
import { RelationshipManagementForm } from '@/features/organisations/components/RelationshipManagementForm'
import { getViewerTimeZone } from '@/lib/viewerTimeZone'

export const metadata: Metadata = {
  title: 'Relationship Management',
}

export default async function RelationshipManagementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [result, timeZone] = await Promise.all([getOrganisation(id), getViewerTimeZone()])

  if (!result.success || !result.data) notFound()

  const organisation = result.data

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${organisation.name} — Relationship Management`}
        description="Research, qualification, outreach & follow-up for this organisation"
      />
      <LinkedOrganisationSummary organisation={organisation} timeZone={timeZone} />
      <RelationshipManagementForm organisation={organisation} />
    </div>
  )
}
