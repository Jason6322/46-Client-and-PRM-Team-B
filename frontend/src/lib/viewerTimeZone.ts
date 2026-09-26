import 'server-only'
import { cookies } from 'next/headers'
import { TIME_ZONE_COOKIE, isValidTimeZone } from '@/lib/timeZone'

/**
 * The viewer's time zone for a Server Component, or undefined before the
 * browser has reported it (the runtime's zone is used for that first render,
 * and `TimeZoneCookie` refreshes the page once the cookie is set).
 */
export async function getViewerTimeZone(): Promise<string | undefined> {
  const value = (await cookies()).get(TIME_ZONE_COOKIE)?.value
  return value && isValidTimeZone(value) ? value : undefined
}
