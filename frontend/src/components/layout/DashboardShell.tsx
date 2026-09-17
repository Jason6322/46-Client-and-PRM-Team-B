import type { ReactNode } from 'react'
import { TopNav } from './TopNav'

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-canvas flex h-screen flex-col overflow-hidden">
      <TopNav />
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto w-full max-w-[1920px]">{children}</div>
      </main>
    </div>
  )
}
