/**
 * Date formatting for the dashboard's Server Components. They render on the
 * server, whose zone isn't the viewer's, so the zone from getViewerTimeZone()
 * is passed in (undefined falls back to the runtime's zone on first render).
 */

/** "Fri 17 Oct 2026, 2:30 pm" */
export function formatDateTimeIn(millis: number, timeZone: string | undefined): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(millis)
}

/** "Fri 17 Oct 2026" — for due dates, which are stored at 12:00 UTC on the day. */
export function formatDayUtc(millis: number): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(millis)
}
