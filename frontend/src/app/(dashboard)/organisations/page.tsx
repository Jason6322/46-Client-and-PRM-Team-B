import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'

export const metadata: Metadata = {
  title: 'Organisations',
}

const COLUMNS = ['Organisation', 'Type', 'Primary Contact', 'Owner', 'Pipeline Stage', 'Tags']

/**
 * Organisations list — screen 3 of the approved prototype.
 *
 * Layout and styling only. The search field and table are not wired to a data
 * source yet, so the table renders its empty state.
 */
export default function OrganisationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisations"
        description="Every organisation, contact and tag in the CRM"
        actions={
          <Link
            href="/organisations/new"
            className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            + Add Organisation
          </Link>
        }
      />

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search by name, contact, or tag..."
          aria-label="Search organisations"
          className="focus:border-brand-500 focus:ring-brand-500/30 w-full rounded-lg border border-zinc-200 bg-white py-3 pr-4 pl-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:outline-none"
        />
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-4xl border-collapse text-left">
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
          </table>
        </div>

        <EmptyState
          title="No organisations yet"
          description="Add an organisation and it will appear here."
        />
      </Card>
    </div>
  )
}
