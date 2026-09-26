import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { listOrganisations } from '@/features/organisations/actions/organisations.actions'
import { formatRelativeTime } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Meetings',
}

/**
 * Meetings & Activities is per organisation, and the nav item carries no
 * organisation, so this picks one first — the same shape as /relationships.
 */
export default async function MeetingsPage() {
  const result = await listOrganisations()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meetings & Activities"
        description="Choose an organisation to see its interactions or log a new one"
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
            description="Add an organisation before logging meetings against it."
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
              href={`/meetings/${organisation.id}`}
              className="hover:border-brand-400 rounded-lg border border-zinc-200 bg-white p-5 transition-colors"
            >
              <p className="text-sm font-semibold text-zinc-900">{organisation.name}</p>
              <p className="text-brand-600 mt-1 text-sm">{organisation.pipelineStage}</p>
              <p className="mt-3 text-xs text-zinc-500">
                Last activity {formatRelativeTime(organisation.lastActivityAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
