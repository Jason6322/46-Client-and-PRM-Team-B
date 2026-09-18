import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { OrganisationForm } from '@/features/organisations/components/OrganisationForm'

export const metadata: Metadata = {
  title: 'Add Organisation',
}

export default function NewOrganisationPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="Add Organisation" description="Fields marked * are required" />
      <OrganisationForm />
    </div>
  )
}
