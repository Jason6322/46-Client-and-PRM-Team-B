import type { Metadata } from 'next'
import { listUsers } from '@/actions/admin.actions'
import { requireAdmin } from '@/actions/auth.actions'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { InviteUserForm } from '@/features/admin/components/InviteUserForm'
import { UsersTable } from '@/features/admin/components/UsersTable'

export const metadata: Metadata = {
  title: 'Admin',
}

export default async function AdminPage() {
  const session = await requireAdmin()
  const result = await listUsers()

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Only people added here can sign in to the CRM" />

      <InviteUserForm />

      {result.success && result.data ? (
        <UsersTable users={result.data} currentUid={session.uid} />
      ) : (
        <Card>
          <EmptyState
            title="Could not load users"
            description={result.error ?? 'Try refreshing the page.'}
          />
        </Card>
      )}
    </div>
  )
}
