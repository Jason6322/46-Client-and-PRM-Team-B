import { LEAD_PRIORITY_CLASSES, type LeadPriority } from '@/features/organisations/constants'
import { cn } from '@/lib/utils'

/** The coloured "● High" pill from the prototype's Relationships screen. */
export function LeadPriorityBadge({
  priority,
  className,
}: {
  priority: LeadPriority
  className?: string
}) {
  const classes = LEAD_PRIORITY_CLASSES[priority]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        classes.badge,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', classes.dot)} aria-hidden="true" />
      {priority}
    </span>
  )
}
