import Link from 'next/link'
import { Card } from '@/components/shared/Card'
import { cn } from '@/lib/utils'
import type { OpportunityListItem } from '@/features/opportunities/types'

/**
 * Opportunities table — the top half of the wireframe.
 *
 * Selecting a row is a link that sets ?selected=, so the chosen opportunity
 * survives a reload and the view can be shared or linked to.
 */

const COLUMNS = ['Opportunity', 'Organisation', 'Type', 'Stage', 'Owner', 'Next Step']

export function OpportunitiesTable({
  opportunities,
  selectedId,
}: {
  opportunities: OpportunityListItem[]
  selectedId: string | null
}) {
  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-3xl border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-100">
              {COLUMNS.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="px-6 py-4 text-xs font-semibold text-zinc-500"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opportunity) => {
              const selected = opportunity.id === selectedId

              return (
                <tr
                  key={opportunity.id}
                  className={cn(
                    'border-b border-zinc-50 last:border-0',
                    selected ? 'bg-brand-50' : 'hover:bg-zinc-50'
                  )}
                >
                  <td className="px-6 py-4 text-sm font-medium">
                    <Link
                      href={`/opportunities?selected=${opportunity.id}`}
                      scroll={false}
                      className="hover:text-brand-600 text-zinc-900 transition-colors"
                    >
                      {opportunity.name}
                    </Link>
                    {opportunity.completedAt !== null && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Complete
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600">
                    <Link
                      href={`/organisations/${opportunity.organisationId}`}
                      className="hover:text-brand-600 transition-colors"
                    >
                      {opportunity.organisationName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{opportunity.type}</td>
                  <td className="text-brand-600 px-6 py-4 text-sm">{opportunity.stage}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{opportunity.owner}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{opportunity.nextStep ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
