'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * TanStack Query client.
 *
 * Created inside state so each browser session gets one client and it is not
 * shared between users during server rendering.
 *
 * `staleTime` is what stops a re-render or a refocus firing another request:
 * cached data is served for a minute before Query considers it worth
 * refetching. That is the setting that removes the repeated calls while a
 * user types in a search box.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
