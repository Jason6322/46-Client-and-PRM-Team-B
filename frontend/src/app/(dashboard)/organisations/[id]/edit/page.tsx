import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { getOrganisation } from '@/features/organisations/actions/organisations.actions'
import { OrganisationForm } from '@/features/organisations/components/OrganisationForm'

export const metadata: Metadata = {
  title: 'Edit Organisation',
}

/** Edit screen — the Add Organisation form pre-filled with the stored record. */
export default async function EditOrganisationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getOrganisation(id)

  if (!result.success || !result.data) notFound()

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title={`Edit ${result.data.name}`} description="Fields marked * are required" />
      <OrganisationForm organisation={result.data} />
    </div>
  )
}
