'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from './AuthProvider'
import { QueryProvider } from './QueryProvider'
import { Toaster } from 'sonner'
import { TimeZoneCookie } from '@/components/shared/TimeZoneCookie'

/**
 * Compose all client-side providers here.
 * Import this in the root layout only.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        {children}
        <Toaster richColors position="top-right" />
        <TimeZoneCookie />
      </AuthProvider>
    </QueryProvider>
  )
}
