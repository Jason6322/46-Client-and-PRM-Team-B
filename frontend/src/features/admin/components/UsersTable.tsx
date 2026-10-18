'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  grantAccess,
  removeUser,
  setUserActive,
  setUserRole,
  type AdminUser,
  type AdminUserStatus,
} from '@/actions/admin.actions'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { resetPassword } from '@/lib/firebase/auth'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { ActionResult } from '@/types'

const secondaryButton =
  'rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-zinc-50 disabled:opacity-60'

const STATUS_LABELS: Record<AdminUserStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700' },
  'no-access': { label: 'No access', className: 'bg-amber-50 text-amber-700' },
  deactivated: { label: 'Deactivated', className: 'bg-zinc-100 text-zinc-500' },
}

/**
 * Confirmation for Remove. Opens centred on the page so a double-click on the
 * row button can't land on the confirm button.
 */
function ConfirmRemoveDialog({
  user,
  pending,
  onConfirm,
  onCancel,
}: {
  user: AdminUser
  pending: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [pending, onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-remove-title"
        aria-describedby="confirm-remove-description"
        className="w-full max-w-md rounded-lg bg-white p-6 text-left shadow-xl"
      >
        <h2 id="confirm-remove-title" className="text-base font-semibold text-zinc-900">
          Remove {user.email}?
        </h2>
        <p id="confirm-remove-description" className="mt-2 text-sm text-zinc-600">
          {user.lastSignInAt
            ? "They'll be signed out everywhere and lose access to the CRM. You can add them again later."
            : "They haven't signed in yet, so their account is deleted and the setup link they were sent stops working."}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className={cn(secondaryButton, 'text-zinc-600')}
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            disabled={pending}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RowActions({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const closeRemove = useCallback(() => setConfirmingRemove(false), [])
  const name = user.displayName ?? user.email

  const remove = async () => {
    setPending('remove')
    const result = await removeUser(user.uid)
    setPending(null)
    if (!result.success) {
      toast.error(result.error ?? 'Failed to remove user')
      return
    }
    toast.success(
      result.data?.deletedAccount
        ? `${user.email} removed — their invite no longer works`
        : `${user.email} removed and signed out`
    )
    setConfirmingRemove(false)
    router.refresh()
  }

  const removeButton = (
    <>
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => setConfirmingRemove(true)}
        className={cn(secondaryButton, 'text-red-600')}
      >
        Remove
      </button>
      {confirmingRemove && (
        <ConfirmRemoveDialog
          user={user}
          pending={pending === 'remove'}
          onConfirm={remove}
          onCancel={closeRemove}
        />
      )}
    </>
  )

  const run = async (key: string, action: () => Promise<ActionResult>, success: string) => {
    setPending(key)
    const result = await action()
    setPending(null)
    if (!result.success) {
      toast.error(result.error ?? 'Something went wrong')
      return
    }
    toast.success(success)
    router.refresh()
  }

  const sendSetupEmail = async () => {
    setPending('email')
    try {
      await resetPassword(user.email)
      toast.success(`Password setup email sent to ${user.email}`)
    } catch {
      toast.error('Could not send the email. Please try again.')
    } finally {
      setPending(null)
    }
  }

  if (isSelf) return <span className="text-xs text-zinc-400">This is you</span>

  if (user.status === 'no-access') {
    return (
      <button
        type="button"
        disabled={pending !== null}
        onClick={() =>
          run(
            'grant',
            async () => {
              const result = await grantAccess(user.uid)
              // Granting may reset the password (unverified accounts), so
              // always send the setup link; a failure is retried from the row.
              if (result.success) await resetPassword(user.email).catch(() => undefined)
              return result
            },
            `${name} can now sign in — a password setup email is on its way`
          )
        }
        className={cn(secondaryButton, 'text-brand-600')}
      >
        {pending === 'grant' ? 'Giving access…' : 'Give access'}
      </button>
    )
  }

  if (user.status === 'deactivated') {
    return (
      <span className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => run('active', () => setUserActive(user.uid, true), `${name} reactivated`)}
          className={cn(secondaryButton, 'text-brand-600')}
        >
          {pending === 'active' ? 'Reactivating…' : 'Reactivate'}
        </button>
        {removeButton}
      </span>
    )
  }

  const nextRole = user.role === 'admin' ? 'user' : 'admin'
  return (
    <span className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        disabled={pending !== null}
        onClick={sendSetupEmail}
        className={cn(secondaryButton, 'text-zinc-700')}
      >
        {pending === 'email' ? 'Sending…' : 'Send setup email'}
      </button>
      <button
        type="button"
        disabled={pending !== null}
        onClick={() =>
          run(
            'role',
            () => setUserRole(user.uid, nextRole),
            nextRole === 'admin' ? `${name} is now an admin` : `${name} is no longer an admin`
          )
        }
        className={cn(secondaryButton, 'text-zinc-700')}
      >
        {pending === 'role' ? 'Saving…' : nextRole === 'admin' ? 'Make admin' : 'Remove admin'}
      </button>
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => run('active', () => setUserActive(user.uid, false), `${name} deactivated`)}
        className={cn(secondaryButton, 'text-red-600')}
      >
        {pending === 'active' ? 'Deactivating…' : 'Deactivate'}
      </button>
      {removeButton}
    </span>
  )
}

export function UsersTable({ users, currentUid }: { users: AdminUser[]; currentUid: string }) {
  const { pageItems, ...pagination } = usePagination(users, 'admin-users')

  if (users.length === 0) {
    return (
      <Card>
        <EmptyState title="No users yet" description="Add someone above to give them access." />
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-100">
                {['Name', 'Email', 'Role', 'Status', 'Last sign-in', ''].map((column, index) => (
                  <th
                    key={column || `actions-${index}`}
                    scope="col"
                    className="px-6 py-4 text-xs font-semibold text-zinc-500"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((user) => {
                const status = STATUS_LABELS[user.status]
                return (
                  <tr
                    key={user.uid}
                    className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-zinc-900">
                      {user.displayName ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {user.role === 'admin' ? 'Admin' : user.role === 'user' ? 'Team member' : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-semibold',
                          status.className
                        )}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {user.lastSignInAt ? formatRelativeTime(user.lastSignInAt) : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <RowActions user={user} isSelf={user.uid === currentUid} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Pagination pagination={pagination} label={users.length === 1 ? 'user' : 'users'} />

      <p className="text-sm text-zinc-500">
        <span className="font-medium text-zinc-700">No access</span> means someone has a Firebase
        account but was never added, so they can&apos;t sign in. Accounts from before sign-up was
        closed may show as Active — deactivate or remove any you don&apos;t recognise. Deactivated
        users are signed out everywhere and can&apos;t sign in until reactivated.{' '}
        <span className="font-medium text-zinc-700">Remove</span> undoes an invite — use it if you
        added the wrong email.
      </p>
    </div>
  )
}
