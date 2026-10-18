import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  title?: string
  /** Shown on the right of the title row, e.g. a "See all" link. */
  action?: ReactNode
  className?: string
  children: ReactNode
}

/** White panel with a hairline border — the surface used across the CRM screens. */
export function Card({ title, action, className, children }: CardProps) {
  return (
    <section className={cn('rounded-lg border border-zinc-200 bg-white p-6', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="text-base font-semibold text-zinc-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
