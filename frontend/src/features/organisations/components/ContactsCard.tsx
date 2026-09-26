import { Card } from '@/components/shared/Card'
import { labelClass } from '@/components/shared/formClasses'

/**
 * Contacts card — left column of screen 4 in the approved prototype.
 *
 * Shows the primary and secondary contacts plus free-text notes. Both contact
 * slots always render so the prototype's structure is visible before the
 * organisations schema lands; a missing contact shows a placeholder dash.
 */

export interface OrganisationContact {
  name?: string
  role?: string
  email?: string
}

interface ContactsCardProps {
  primary?: OrganisationContact
  secondary?: OrganisationContact
  notes?: string
}

function ContactBlock({ label, contact }: { label: string; contact?: OrganisationContact }) {
  const heading = [contact?.name, contact?.role].filter(Boolean).join(' — ')

  return (
    <div>
      <p className={labelClass}>{label}</p>
      {heading ? (
        <p className="mt-1 text-sm text-zinc-900">{heading}</p>
      ) : (
        <p className="mt-1 text-sm text-zinc-400">—</p>
      )}
      {contact?.email && (
        <a
          href={`mailto:${contact.email}`}
          className="hover:text-brand-600 mt-0.5 block text-xs text-zinc-500 transition-colors"
        >
          {contact.email}
        </a>
      )}
    </div>
  )
}

export function ContactsCard({ primary, secondary, notes }: ContactsCardProps) {
  return (
    <Card title="Contacts">
      <div className="space-y-5">
        <ContactBlock label="Primary" contact={primary} />
        <ContactBlock label="Secondary" contact={secondary} />

        <div>
          <p className={labelClass}>Notes</p>
          {notes ? (
            <p className="mt-1 text-sm whitespace-pre-line text-zinc-900">{notes}</p>
          ) : (
            <p className="mt-1 text-sm text-zinc-400">No notes yet</p>
          )}
        </div>
      </div>
    </Card>
  )
}
