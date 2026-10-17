import { requireAuth } from '@/actions/auth.actions'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuth()

  return <DashboardShell>{children}</DashboardShell>
}
