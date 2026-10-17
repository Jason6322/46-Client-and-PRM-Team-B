import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { PaginatedList } from '@/components/shared/Pagination'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  BackToDashboard,
  DetailFields,
  ExternalLink,
} from '@/features/dashboard/components/DetailList'
import { listOpportunities } from '@/features/opportunities/actions/opportunities.actions'
import { formatDate, formatRelativeTime } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Active Partnership Opportunities',
}

/**
 * Every open opportunity with its full details — the list behind the
 * dashboard's Active Partnership Opportunities card, which shows eight rows.
 * The Opportunities screen is the compact, sortable table of the same records.
 */
export default async function ActiveOpportunitiesPage() {
  const result = await listOpportunities()
  const open = (result.data ?? []).filter((opportunity) => opportunity.completedAt === null)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Active Partnership Opportunities"
        description="Every open opportunity across all organisations, most recently updated first"
        actions={<BackToDashboard />}
      />

      {!result.success ? (
        <Card>
          <EmptyState
            title="Could not load opportunities"
            description={result.error ?? 'Try refreshing the page.'}
          />
        </Card>
      ) : open.length === 0 ? (
        <Card>
          <EmptyState
            title="No open opportunities"
            description="Raise one against an organisation and it will appear here."
            action={
              <Link
                href="/opportunities/new"
                className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                + New Opportunity
              </Link>
            }
          />
        </Card>
      ) : (
        <Card className="p-0">
          <p className="border-b border-zinc-100 px-6 py-3 text-xs text-zinc-500">
            {open.length} open {open.length === 1 ? 'opportunity' : 'opportunities'}
          </p>
          <PaginatedList
            storageKey="dashboard-opportunities"
            label="opportunities"
            paginationClassName="border-t border-zinc-100 px-6 py-3"
          >
            {open.map((opportunity) => (
              <li key={opportunity.id} className="border-b border-zinc-50 px-6 py-4 last:border-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link
                    href={`/opportunities/${opportunity.id}`}
                    className="hover:text-brand-600 text-sm font-semibold text-zinc-900 transition-colors"
                  >
                    {opportunity.name}
                  </Link>
                  <span className="bg-brand-50 text-brand-700 rounded px-2 py-0.5 text-xs font-semibold">
                    {opportunity.stage}
                  </span>
                  <span className="text-xs text-zinc-500">{opportunity.type}</span>
                  <span className="ml-auto text-xs text-zinc-500">
                    Updated {formatRelativeTime(opportunity.updatedAt)}
                  </span>
                </div>

                <DetailFields
                  fields={[
                    [
                      'Organisation',
                      <Link
                        key="organisation"
                        href={`/organisations/${opportunity.organisationId}`}
                        className="hover:text-brand-600 transition-colors"
                      >
                        {opportunity.organisationName}
                      </Link>,
                    ],
                    ['Assigned to', opportunity.assignedTo.map((member) => member.name).join(', ')],
                    ['Next step', opportunity.nextStep],
                    ['Description', opportunity.description],
                    ['Expected outcome', opportunity.expectedOutcome],
                    [
                      'Proposal',
                      opportunity.proposalDocument && (
                        <ExternalLink href={opportunity.proposalDocument} />
                      ),
                    ],
                    ['Created', formatDate(new Date(opportunity.createdAt))],
                  ]}
                />
              </li>
            ))}
          </PaginatedList>
        </Card>
      )}
    </div>
  )
}
