'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/shared/Card'
import { listCalendarMeetings } from '@/features/organisations/actions/organisations.actions'
import { cn } from '@/lib/utils'

/**
 * Month calendar for the Meetings & Activities tab, from the prototype.
 *
 * Two marks per day: a dot for an interaction logged against this
 * organisation, and a bar for a meeting booked with any organisation, so the
 * team can see when they are free before booking another. Choosing a day
 * filters the timeline beside it and lists that day's meetings across every
 * organisation. Days are keyed "2026-08-29" in the viewer's own zone — this
 * renders in the browser, so local dates are the viewer's dates.
 */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Query key prefix for the calendar's meetings — invalidate it after logging or archiving one. */
export const CALENDAR_MEETINGS_KEY = ['calendar-meetings'] as const

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

/** "10:30 am" in the viewer's zone. */
function timeOfDay(millis: number) {
  return new Date(millis).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
}

export function ActivityCalendar({
  organisationId,
  activityDays,
  selectedDay,
  onSelectDay,
}: {
  /** The organisation whose page this is — its meetings are marked in the day list. */
  organisationId: string
  /** Number of interactions with this organisation per day key. */
  activityDays: Map<string, number>
  selectedDay: string | null
  onSelectDay: (day: string | null) => void
}) {
  const [visible, setVisible] = useState(() => {
    const today = new Date()
    return { year: today.getFullYear(), month: today.getMonth() }
  })
  const today = dayKey(new Date())

  // Each month is fetched once and then served from the query cache, so
  // paging back and forth does not re-read Firestore.
  const meetingsQuery = useQuery({
    queryKey: [...CALENDAR_MEETINGS_KEY, visible.year, visible.month],
    queryFn: async () => {
      const result = await listCalendarMeetings({
        from: new Date(visible.year, visible.month, 1).getTime(),
        to: new Date(visible.year, visible.month + 1, 1).getTime() - 1,
      })
      if (!result.success) throw new Error(result.error ?? 'Failed to load meetings')
      return result.data ?? []
    },
  })
  const meetings = meetingsQuery.data ?? []

  const meetingDays = new Map<string, number>()
  for (const { activity } of meetings) {
    if (activity.occurredAt === null) continue
    const key = dayKey(new Date(activity.occurredAt))
    meetingDays.set(key, (meetingDays.get(key) ?? 0) + 1)
  }
  const selectedMeetings =
    selectedDay === null
      ? []
      : meetings.filter(
          ({ activity }) =>
            activity.occurredAt !== null && dayKey(new Date(activity.occurredAt)) === selectedDay
        )

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
        {meetingsQuery.isFetching && (
          <span className="text-xs text-zinc-400" aria-live="polite">
            Loading meetings...
          </span>
        )}
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
          const booked = meetingDays.get(key) ?? 0
          const selected = key === selectedDay
          const label = [
            date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' }),
            count > 0 && `${count} logged with this organisation`,
            booked > 0 && `${booked} ${booked === 1 ? 'meeting' : 'meetings'} booked`,
          ]
            .filter(Boolean)
            .join(', ')

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(selected ? null : key)}
              aria-pressed={selected}
              aria-label={label}
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
              <span className="mt-0.5 flex h-1 items-center gap-0.5" aria-hidden="true">
                <span className={cn('h-1 w-1 rounded-full', count > 0 && 'bg-brand-600')} />
                <span className={cn('h-1 w-2 rounded-full', booked > 0 && 'bg-amber-500')} />
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 space-y-1 text-xs text-zinc-500">
        <p className="flex items-center gap-2">
          <span className="bg-brand-600 h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden="true" />
          Logged with this organisation — select a day to filter the timeline
        </p>
        <p className="flex items-center gap-2">
          <span className="h-1.5 w-3 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
          Meeting booked with any organisation
        </p>
      </div>

      {meetingsQuery.isError && (
        <p className="mt-4 text-xs text-red-600">Could not load meetings for this month.</p>
      )}

      {selectedDay !== null && !meetingsQuery.isPending && !meetingsQuery.isError && (
        <div className="mt-4 border-t border-zinc-100 pt-4">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase">
            Meetings on{' '}
            {new Date(`${selectedDay}T00:00`).toLocaleDateString('en-AU', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}{' '}
            — all organisations
          </h3>
          {selectedMeetings.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No meetings booked — free all day.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {selectedMeetings.map(({ organisationId: id, organisationName, activity }) => (
                <li key={`${id}-${activity.id}`} className="flex gap-3 text-sm">
                  <span className="w-16 shrink-0 font-medium text-zinc-900 tabular-nums">
                    {activity.occurredAt !== null && timeOfDay(activity.occurredAt)}
                  </span>
                  <span className="min-w-0">
                    {id === organisationId ? (
                      <span className="font-medium text-zinc-900">
                        {organisationName}{' '}
                        <span className="text-zinc-500">(this organisation)</span>
                      </span>
                    ) : (
                      <Link
                        href={`/meetings/${id}`}
                        className="text-brand-600 hover:text-brand-700 font-medium"
                      >
                        {organisationName}
                      </Link>
                    )}
                    {activity.responsible && (
                      <span className="block truncate text-xs text-zinc-500">
                        {activity.responsible}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}
