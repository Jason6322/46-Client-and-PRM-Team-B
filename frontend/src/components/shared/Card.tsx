import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  title?: string
  className?: string
  children: ReactNode
}

/** White panel with a hairline border — the surface used across the CRM screens. */
export function Card({ title, className, children }: CardProps) {
  return (
    <section className={cn('rounded-lg border border-zinc-200 bg-white p-6', className)}>
      {title && <h2 className="mb-4 text-base font-semibold text-zinc-900">{title}</h2>}
      {children}
    </section>
  )
}
