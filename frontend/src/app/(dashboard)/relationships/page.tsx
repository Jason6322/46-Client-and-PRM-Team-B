import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { listOrganisations } from '@/features/organisations/actions/organisations.actions'
import { formatRelativeTime } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Relationships',
}

/**
 * Relationship management is per organisation, but the nav item carries no
 * organisation, so this picks one first and links through to its screen.
 */
export default async function RelationshipsPage() {
  const result = await listOrganisations()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relationships"
        description="Research, qualification, outreach and follow-up — choose an organisation"
      />

      {!result.success || !result.data ? (
        <Card>
          <EmptyState
            title="Could not load organisations"
            description={result.error ?? 'Try refreshing the page.'}
          />
        </Card>
      ) : result.data.length === 0 ? (
        <Card>
          <EmptyState
            title="No organisations yet"
            description="Add an organisation and it will appear here."
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.data.map((organisation) => (
            <Link
              key={organisation.id}
              href={`/relationships/${organisation.id}`}
              className="hover:border-brand-400 rounded-lg border border-zinc-200 bg-white p-5 transition-colors"
            >
              <p className="text-sm font-semibold text-zinc-900">{organisation.name}</p>
              <p className="text-brand-600 mt-1 text-sm">
                {organisation.pipelineStage}
                {organisation.relationshipStatus && (
                  <span className="text-zinc-500"> · {organisation.relationshipStatus}</span>
                )}
              </p>
              <p className="mt-3 text-xs text-zinc-500">
                {organisation.relationshipOwner} · {formatRelativeTime(organisation.lastActivityAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
