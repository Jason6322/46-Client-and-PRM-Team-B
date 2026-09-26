import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  getOrganisation,
  listOrganisationActivities,
} from '@/features/organisations/actions/organisations.actions'
import { LinkedOrganisationSummary } from '@/features/organisations/components/LinkedOrganisationSummary'
import { MeetingsActivities } from '@/features/organisations/components/MeetingsActivities'

export const metadata: Metadata = {
  title: 'Meetings & Activities',
}

export default async function MeetingsForOrganisationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getOrganisation(id)

  if (!result.success || !result.data) notFound()

  const activities = await listOrganisationActivities(id)

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${result.data.name} — Meetings & Activities`}
        description="Meetings, calls, emails and notes logged against this organisation"
      />
      <LinkedOrganisationSummary organisation={result.data} />
      <MeetingsActivities organisationId={id} activities={activities.data ?? []} />
    </div>
  )
}
