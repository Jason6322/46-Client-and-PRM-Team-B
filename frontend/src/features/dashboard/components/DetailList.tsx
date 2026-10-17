import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/**
 * Label/value pairs for one item on a "See all" page. Empty values are left
 * out, so a sparsely filled record doesn't render a column of dashes.
 */
export function DetailFields({ fields }: { fields: [label: string, value: ReactNode][] }) {
  const shown = fields.filter(
    ([, value]) => value !== null && value !== undefined && value !== '' && value !== false
  )
  if (shown.length === 0) return null

  return (
    <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {shown.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{label}</dt>
          <dd className="mt-0.5 break-words whitespace-pre-line text-zinc-800">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** An external link inside DetailFields; values are http(s) only (validated on save). */
export function ExternalLink({ href, children }: { href: string; children?: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-brand-600 hover:text-brand-700 break-all underline-offset-2 hover:underline"
    >
      {children ?? href}
    </a>
  )
}

/** The header action on every "See all" page. */
export function BackToDashboard() {
  return (
    <Link
      href="/dashboard"
      className="text-brand-600 inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-zinc-50"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to Dashboard
    </Link>
  )
}
