import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'

export const metadata: Metadata = {
  title: 'Dashboard',
}

const STAT_CARDS = [
  'Active Organisations',
  'Follow-ups',
  'Active Opportunities',
  'Meetings (next 7 days)',
]

/**
 * CRM dashboard — screen 1 of the approved prototype.
 *
 * Layout and styling only. No data source is wired up yet, so every panel
 * renders its empty state.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of relationship activity across all organisations"
        actions={
          <Link
            href="/organisations/new"
            className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            + Add Organisation
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((label) => (
          <Card key={label} className="p-5">
            <p className="text-2xl font-normal text-zinc-400">—</p>
            <p className="mt-1 text-sm text-zinc-500">{label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Relationships by Pipeline Stage" className="lg:col-span-2">
          <EmptyState title="No organisations yet" />
        </Card>

        <div className="space-y-6">
          <Card title="Recent Activity">
            <EmptyState title="No activity yet" />
          </Card>

          <Card title="Upcoming Meetings">
            <EmptyState title="No meetings yet" />
          </Card>
        </div>
      </div>

      <Card title="Active Partnership Opportunities">
        <EmptyState title="No opportunities yet" />
      </Card>
    </div>
  )
}
