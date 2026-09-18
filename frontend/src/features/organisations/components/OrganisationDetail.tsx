'use client'

import { useState } from 'react'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { ContactsCard } from './ContactsCard'
import { OrganisationDetailsCard } from './OrganisationDetailsCard'

/**
 * Organisation detail — screen 4 of the approved prototype.
 *
 * Layout and styling only. The tabs switch, but no panel is wired to a data
 * source yet, so each renders its placeholder or empty state.
 */

const TABS = [
  'Overview',
  'Relationship Management',
  'Pipeline',
  'Meetings & Activities',
  'Opportunities',
] as const

type Tab = (typeof TABS)[number]

export function OrganisationDetail() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200">
        <div
          role="tablist"
          aria-label="Organisation sections"
          className="flex gap-6 overflow-x-auto"
        >
          {TABS.map((tab) => {
            const active = tab === activeTab
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  '-mb-px shrink-0 border-b-2 pb-3 text-sm transition-colors',
                  active
                    ? 'border-brand-600 text-brand-600 font-semibold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                )}
              >
                {tab}
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 'Overview' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <OrganisationDetailsCard />
            <ContactsCard />
          </div>

          <div className="space-y-6">
            <Card title="Pipeline Status">
              <EmptyState title="No pipeline status yet" />
            </Card>

            <Card title="Activity Timeline">
              <EmptyState title="No activity yet" />
            </Card>

            <Card title="Linked Opportunities">
              <EmptyState title="No opportunities yet" />
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <EmptyState title={`${activeTab} is not built yet`} />
        </Card>
      )}
    </div>
  )
}
