'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/shared/Card'
import { cn } from '@/lib/utils'

/**
 * Month calendar for the Meetings & Activities tab, from the prototype.
 *
 * A dot marks each day with a logged interaction; choosing a day filters the
 * timeline beside it. Days are keyed "2026-08-29" in the viewer's own zone —
 * this renders in the browser, so local dates are the viewer's dates.
 */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** "2026-08-29" for a local date. */
export function dayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** The month's days, padded with nulls so the 1st falls under its weekday (Monday first). */
function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const leading = (first.getDay() + 6) % 7
  const length = new Date(year, month + 1, 0).getDate()
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length }, (_, index) => new Date(year, month, index + 1)),
  ]
}

export function ActivityCalendar({
  activityDays,
  selectedDay,
  onSelectDay,
}: {
  /** Number of interactions per day key. */
  activityDays: Map<string, number>
  selectedDay: string | null
  onSelectDay: (day: string | null) => void
}) {
  const [visible, setVisible] = useState(() => {
    const today = new Date()
    return { year: today.getFullYear(), month: today.getMonth() }
  })
  const today = dayKey(new Date())

  const shiftMonth = (delta: number) =>
    setVisible(({ year, month }) => {
      const next = new Date(year, month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })

  const title = new Date(visible.year, visible.month, 1).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-base font-semibold text-zinc-900">Calendar</h2>
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="min-w-32 text-center text-sm font-semibold text-zinc-900" aria-live="polite">
          {title}
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((weekday) => (
          <p key={weekday} className="pb-2 text-xs font-semibold text-zinc-500 uppercase">
            {weekday}
          </p>
        ))}

        {monthGrid(visible.year, visible.month).map((date, index) => {
          if (!date) return <span key={`blank-${index}`} />

          const key = dayKey(date)
          const count = activityDays.get(key) ?? 0
          const selected = key === selectedDay

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(selected ? null : key)}
              aria-pressed={selected}
              aria-label={`${date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}${
                count > 0 ? `, ${count} logged` : ''
              }`}
              className="group flex flex-col items-center py-1"
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors',
                  selected
                    ? 'bg-brand-600 font-semibold text-white'
                    : key === today
                      ? 'text-brand-600 group-hover:bg-brand-50 font-semibold'
                      : 'text-zinc-700 group-hover:bg-zinc-100'
                )}
              >
                {date.getDate()}
              </span>
              <span
                className={cn('mt-0.5 h-1 w-1 rounded-full', count > 0 ? 'bg-brand-600' : '')}
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
        <span className="bg-brand-600 h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden="true" />
        Day with a logged meeting or activity — select a day to filter the timeline
      </p>
    </Card>
  )
}
