import { Card } from '@/components/shared/Card'
import { labelClass } from '@/components/shared/formClasses'
import { cn } from '@/lib/utils'

/**
 * Organisation Details card — left column of screen 4 in the approved prototype.
 *
 * Read-only display; editing happens through the Edit Organisation action.
 * Every prop is optional so the card renders its placeholder dashes until the
 * organisations schema lands and the detail page is wired to Firestore.
 */

interface OrganisationDetailsCardProps {
  industry?: string
  country?: string
  website?: string
  relationshipOwner?: string
  relationshipStatus?: string
  tags?: string[]
}

const valueClass =
  'mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900'

function ReadOnlyField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <p className={cn(valueClass, !value && 'text-zinc-400')}>{value ?? '—'}</p>
    </div>
  )
}

export function OrganisationDetailsCard({
  industry,
  country,
  website,
  relationshipOwner,
  relationshipStatus,
  tags,
}: OrganisationDetailsCardProps) {
  return (
    <Card title="Organisation Details">
      <div className="grid gap-5 sm:grid-cols-2">
        <ReadOnlyField label="Industry / Sector" value={industry} />
        <ReadOnlyField label="Country" value={country} />
        <ReadOnlyField label="Website" value={website} />
        <ReadOnlyField label="Relationship Owner" value={relationshipOwner} />
        <ReadOnlyField label="Relationship Status" value={relationshipStatus} />
      </div>

      <div className="mt-5">
        <p className={labelClass}>Tags</p>
        {tags && tags.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
                {tag}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">No tags yet</p>
        )}
      </div>
    </Card>
  )
}
