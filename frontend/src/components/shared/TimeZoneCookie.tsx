'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TIME_ZONE_COOKIE } from '@/lib/timeZone'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

/**
 * Reports the browser's time zone to the server so Server Components can work
 * out "today" in the viewer's zone. Renders nothing.
 *
 * Refreshes only when the cookie was missing or stale, so the page re-renders
 * with the right dates at most once per zone change.
 */
export function TimeZoneCookie() {
  const router = useRouter()

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const current = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${TIME_ZONE_COOKIE}=`))
      ?.slice(TIME_ZONE_COOKIE.length + 1)

    if (current === encodeURIComponent(zone)) return

    document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
    router.refresh()
  }, [router])

  return null
}
