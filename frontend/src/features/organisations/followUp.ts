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

/** Today's calendar date in the viewer's own zone, as "2026-09-02". */
function todayDateOnly(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** A follow-up is overdue once its due day has passed; due today is not overdue. */
export function isOverdue(dueMillis: number): boolean {
  return millisToDateOnly(dueMillis) < todayDateOnly()
}

export function isDueToday(dueMillis: number): boolean {
  return millisToDateOnly(dueMillis) === todayDateOnly()
}
