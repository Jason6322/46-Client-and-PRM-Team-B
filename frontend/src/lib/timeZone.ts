/**
 * The viewer's IANA time zone, carried to the server in a cookie.
 *
 * Server Components render in the host's zone (UTC on Vercel), so anything
 * that depends on "today" — overdue and due-today follow-ups — needs the
 * viewer's zone passed in. `TimeZoneCookie` writes it from the browser and
 * `getViewerTimeZone()` reads it back.
 */

export const TIME_ZONE_COOKIE = 'tz'

/** Guards against a tampered cookie — Intl throws a RangeError on an unknown zone. */
export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: value })
    return true
  } catch {
    return false
  }
}
