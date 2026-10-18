import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/** "See all ›" in a dashboard card's title row, opening the full list. */
export function SeeAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={`See all ${label}`}
      className="text-brand-600 hover:text-brand-700 inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold transition-colors"
    >
      See all
      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  )
}
