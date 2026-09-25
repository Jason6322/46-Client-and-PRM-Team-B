import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { listOrganisations } from '@/features/organisations/actions/organisations.actions'
import { PipelineBoard } from '@/features/organisations/components/PipelineBoard'

export const metadata: Metadata = {
  title: 'Pipeline',
}

/** Relationship pipeline — screen 2 of the relationships wireframe. */
export default async function PipelinePage() {
  const result = await listOrganisations()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relationship Pipeline"
        description="Drag an organisation card between stages to update its status"
      />

      {!result.success || !result.data ? (
        <Card>
          <EmptyState
            title="Could not load the pipeline"
            description={result.error ?? 'Try refreshing the page.'}
          />
        </Card>
      ) : result.data.length === 0 ? (
        <Card>
          <EmptyState
            title="No organisations yet"
            description="Add an organisation and it will appear in the pipeline."
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
        <PipelineBoard organisations={result.data} />
      )}
    </div>
  )
}
