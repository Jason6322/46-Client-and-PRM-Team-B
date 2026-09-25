'use client'

import { useState } from 'react'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, formatRelativeTime } from '@/lib/utils'
import { ContactsCard } from './ContactsCard'
import { OrganisationDetailsCard } from './OrganisationDetailsCard'
import { NextActionEditor } from './NextActionEditor'
import { PipelineStageSelect } from './PipelineStageSelect'
import { RelationshipManagementForm } from './RelationshipManagementForm'
import type { OrganisationListItem } from '@/features/organisations/types'

/**
 * Organisation detail — screen 4 of the approved prototype.
 *
 * The Overview tab is wired to real data. The remaining tabs belong to
 * features that are not built yet, so they render their empty state.
 */

const TABS = [
  'Overview',
  'Relationship Management',
  'Pipeline',
  'Meetings & Activities',
  'Opportunities',
] as const

type Tab = (typeof TABS)[number]

export function OrganisationDetail({ organisation }: { organisation: OrganisationListItem }) {
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
            <OrganisationDetailsCard
              industry={organisation.industry ?? undefined}
              country={organisation.country}
              website={organisation.website ?? undefined}
              relationshipOwner={organisation.relationshipOwner}
              relationshipStatus={organisation.relationshipStatus ?? undefined}
              tags={organisation.tags}
            />
            <ContactsCard
              primary={{
                name: organisation.primaryContact.name,
                role: organisation.primaryContact.role ?? undefined,
                email: organisation.primaryContact.email ?? undefined,
              }}
              secondary={
                organisation.secondaryContact
                  ? {
                      name: organisation.secondaryContact.name,
                      role: organisation.secondaryContact.role ?? undefined,
                      email: organisation.secondaryContact.email ?? undefined,
                    }
                  : undefined
              }
              notes={organisation.notes ?? undefined}
            />
          </div>

          <div className="space-y-6">
            <Card title="Pipeline Status">
              <PipelineStageSelect id={organisation.id} stage={organisation.pipelineStage} />
              <NextActionEditor
                id={organisation.id}
                nextAction={organisation.nextAction}
                nextActionDueAt={organisation.nextActionDueAt}
              />
              <dl className="mt-4 space-y-1 text-sm text-zinc-500">
                <div>
                  <dt className="inline">Last updated: </dt>
                  <dd className="inline">{formatRelativeTime(organisation.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="inline">Last activity: </dt>
                  <dd className="inline">{formatRelativeTime(organisation.lastActivityAt)}</dd>
                </div>
                <div>
                  <dt className="inline">Relationship status: </dt>
                  <dd className={cn('inline', !organisation.relationshipStatus && 'text-zinc-400')}>
                    {organisation.relationshipStatus ?? 'Not set'}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card title="Activity Timeline">
              <ul className="space-y-2 text-sm text-zinc-600">
                <li>Organisation added to CRM ({formatRelativeTime(organisation.createdAt)})</li>
                {organisation.updatedAt !== organisation.createdAt && (
                  <li>Details updated ({formatRelativeTime(organisation.updatedAt)})</li>
                )}
              </ul>
              <p className="mt-4 text-xs text-zinc-400">
                Calls, meetings and emails appear here once activity logging is built.
              </p>
            </Card>

            <Card title="Linked Opportunities">
              <EmptyState title="No opportunities yet" />
            </Card>
          </div>
        </div>
      ) : activeTab === 'Relationship Management' ? (
        <RelationshipManagementForm organisation={organisation} />
      ) : (
        <Card>
          <EmptyState title={`${activeTab} is not built yet`} />
        </Card>
      )}
    </div>
  )
}
