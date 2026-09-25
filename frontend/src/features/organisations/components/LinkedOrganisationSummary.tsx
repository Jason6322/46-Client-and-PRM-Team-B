import Link from 'next/link'
import { Card } from '@/components/shared/Card'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { isOverdue } from '@/features/organisations/followUp'
import { cn } from '@/lib/utils'
import type { OrganisationListItem } from '@/features/organisations/types'

/**
 * The organisation's own record, shown above the relationship screen so the
 * details being researched are on the same page as the research.
 *
 * Read-only — everything here is edited on the profile, and this links there.
 */

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-900">{children}</dd>
    </div>
  )
}

export function LinkedOrganisationSummary({
  organisation,
}: {
  organisation: OrganisationListItem
}) {
  const { primaryContact, secondaryContact } = organisation
  const overdue = organisation.nextActionDueAt !== null && isOverdue(organisation.nextActionDueAt)

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-base font-semibold text-zinc-900">Organisation</h2>
        <Link
          href={`/organisations/${organisation.id}`}
          className="text-brand-600 hover:text-brand-700 text-sm font-semibold transition-colors"
        >
          View full profile
        </Link>
      </div>

      <dl className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Item label="Type">{organisation.type}</Item>
        <Item label="Industry / Sector">
          {organisation.industry ?? <span className="text-zinc-400">—</span>}
        </Item>
        <Item label="Country">{organisation.country}</Item>
        <Item label="Stage">
          <span className="text-brand-600">{organisation.pipelineStage}</span>
          {organisation.relationshipStatus && (
            <span className="text-zinc-500"> · {organisation.relationshipStatus}</span>
          )}
        </Item>

        <Item label="Primary contact">
          {[primaryContact.name, primaryContact.role].filter(Boolean).join(' — ')}
          {primaryContact.email && (
            <a
              href={`mailto:${primaryContact.email}`}
              className="hover:text-brand-600 mt-0.5 block text-xs text-zinc-500 transition-colors"
            >
              {primaryContact.email}
            </a>
          )}
        </Item>
        <Item label="Secondary contact">
          {secondaryContact ? (
            [secondaryContact.name, secondaryContact.role].filter(Boolean).join(' — ')
          ) : (
            <span className="text-zinc-400">—</span>
          )}
        </Item>
        <Item label="Website">
          {organisation.website ? (
            <a
              href={organisation.website}
              target="_blank"
              rel="noreferrer noopener"
              className="text-brand-600 hover:text-brand-700 transition-colors"
            >
              {organisation.website}
            </a>
          ) : (
            <span className="text-zinc-400">—</span>
          )}
        </Item>
        <Item label="Last activity">
          <span className="text-zinc-500">{formatRelativeTime(organisation.lastActivityAt)}</span>
        </Item>

        <div className="sm:col-span-2 lg:col-span-4">
          <dt className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Tags</dt>
          <dd className="mt-1">
            {organisation.tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {organisation.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm text-zinc-400">No tags yet</span>
            )}
          </dd>
        </div>

        {organisation.nextActionDueAt !== null && (
          <div className="sm:col-span-2 lg:col-span-4">
            <dt className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Follow-up due
            </dt>
            <dd
              className={cn('mt-1 text-sm', overdue ? 'font-medium text-red-600' : 'text-zinc-900')}
            >
              {formatDate(new Date(organisation.nextActionDueAt))}
              {overdue && ' — overdue'}
            </dd>
          </div>
        )}
      </dl>
    </Card>
  )
}
