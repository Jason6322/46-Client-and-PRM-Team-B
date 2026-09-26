/**
 * Follow-up date helpers.
 *
 * A date input produces a calendar date ("2026-09-02") with no time or zone,
 * but Firestore stores an instant. Due dates are stored at 12:00 UTC so the
 * calendar day survives conversion in any zone from UTC-11 to UTC+11 —
 * storing midnight would show the previous day for anyone west of UTC.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export function isDateOnly(value: string): boolean {
  return DATE_ONLY.test(value)
}

/** "2026-09-02" → the instant to store. */
export function dateOnlyToDate(value: string): Date {
  return new Date(`${value}T12:00:00Z`)
}

/** Stored millis → "2026-09-02", for a date input's value. */
export function millisToDateOnly(millis: number): string {
  return new Date(millis).toISOString().slice(0, 10)
}

/**
 * Today's calendar date, as "2026-09-02", in `timeZone`.
 *
 * In the browser, leave `timeZone` out and the viewer's own zone is used. On
 * the server the runtime's zone is usually UTC, so Server Components must pass
 * the viewer's zone from `getViewerTimeZone()` — otherwise "today" is a day
 * off for Australian users for much of each day.
 */
function todayDateOnly(timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(new Date())
}

/** A follow-up is overdue once its due day has passed; due today is not overdue. */
export function isOverdue(dueMillis: number, timeZone?: string): boolean {
  return millisToDateOnly(dueMillis) < todayDateOnly(timeZone)
}

export function isDueToday(dueMillis: number, timeZone?: string): boolean {
  return millisToDateOnly(dueMillis) === todayDateOnly(timeZone)
}

const DAY_MS = 86_400_000

/**
 * "Due in 3d", "Due today", "Overdue by 2d" — counted in whole calendar days,
 * because a due date has no time of day.
 */
export function describeDue(dueMillis: number, timeZone?: string): string {
  const days = Math.round(
    (dateOnlyToDate(millisToDateOnly(dueMillis)).getTime() -
      dateOnlyToDate(todayDateOnly(timeZone)).getTime()) /
      DAY_MS
  )

  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days > 0) return `Due in ${days}d`
  return `Overdue by ${-days}d`
}
