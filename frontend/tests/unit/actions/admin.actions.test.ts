import { beforeEach, describe, expect, it, vi } from 'vitest'

const profileDelete = vi.fn()
const getUser = vi.fn()
const deleteUser = vi.fn()
const revokeRefreshTokens = vi.fn()
const updateUser = vi.fn()
const listAuthUsers = vi.fn()
const profilesGet = vi.fn()
const profileGet = vi.fn()
const profileSet = vi.fn()

vi.mock('@/actions/auth.actions', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ uid: 'admin-1' }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: { getUser, deleteUser, revokeRefreshTokens, updateUser, listUsers: listAuthUsers },
  adminDb: {
    collection: () => ({
      get: profilesGet,
      doc: () => ({ delete: profileDelete, get: profileGet, set: profileSet }),
    }),
  },
}))

const { grantAccess, listUsers, removeUser } = await import('@/actions/admin.actions')

function account(lastSignInTime: string | undefined) {
  return { uid: 'u2', metadata: { lastSignInTime } }
}

describe('removeUser — undoing a wrong invite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes the account and profile when the invite was never used', async () => {
    getUser.mockResolvedValue(account(undefined))

    const result = await removeUser('u2')

    expect(result).toEqual({ success: true, data: { deletedAccount: true } })
    expect(deleteUser).toHaveBeenCalledWith('u2')
    expect(profileDelete).toHaveBeenCalled()
  })

  it('keeps the account but revokes its sessions once they have signed in', async () => {
    getUser.mockResolvedValue(account('Fri, 16 Oct 2026 09:00:00 GMT'))

    const result = await removeUser('u2')

    expect(result).toEqual({ success: true, data: { deletedAccount: false } })
    expect(deleteUser).not.toHaveBeenCalled()
    expect(revokeRefreshTokens).toHaveBeenCalledWith('u2')
    expect(profileDelete).toHaveBeenCalled()
  })

  it('still removes the profile when the Auth account is already gone', async () => {
    getUser.mockRejectedValue({ code: 'auth/user-not-found' })

    const result = await removeUser('u2')

    expect(result.success).toBe(true)
    expect(profileDelete).toHaveBeenCalled()
  })

  it('refuses to remove the signed-in admin', async () => {
    const result = await removeUser('admin-1')

    expect(result).toEqual({ success: false, error: "You can't remove your own account" })
    expect(getUser).not.toHaveBeenCalled()
    expect(profileDelete).not.toHaveBeenCalled()
  })

  it('reports a failure without deleting the profile', async () => {
    getUser.mockRejectedValue(new Error('network'))

    const result = await removeUser('u2')

    expect(result).toEqual({ success: false, error: 'Failed to remove user' })
    expect(profileDelete).not.toHaveBeenCalled()
  })
})

describe('grantAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profileGet.mockResolvedValue({ exists: false })
  })

  it('re-enables an account that was deactivated and then removed', async () => {
    getUser.mockResolvedValue({ uid: 'u2', email: 'a@b.co', emailVerified: true, disabled: true })

    const result = await grantAccess('u2')

    expect(result).toEqual({ success: true })
    expect(updateUser).toHaveBeenCalledWith('u2', { disabled: false })
    expect(profileSet).toHaveBeenCalled()
  })

  it('leaves an enabled, verified account alone', async () => {
    getUser.mockResolvedValue({ uid: 'u2', email: 'a@b.co', emailVerified: true, disabled: false })

    await grantAccess('u2')

    expect(updateUser).not.toHaveBeenCalled()
  })
})

describe('listUsers', () => {
  it('reads every page of Firebase Auth accounts', async () => {
    vi.clearAllMocks()
    profilesGet.mockResolvedValue({ docs: [] })
    const record = (uid: string) => ({ uid, email: uid + '@b.co', metadata: {} })
    listAuthUsers
      .mockResolvedValueOnce({ users: [record('u1')], pageToken: 'next' })
      .mockResolvedValueOnce({ users: [record('u2')] })

    const result = await listUsers()

    expect(listAuthUsers).toHaveBeenLastCalledWith(1000, 'next')
    expect(result.data?.map((user) => user.uid)).toEqual(['u1', 'u2'])
  })
})
