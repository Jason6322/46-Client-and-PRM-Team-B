import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArchivedOrganisationsTable } from '@/features/organisations/components/ArchivedOrganisationsTable'
import type { OrganisationListItem } from '@/features/organisations/types'

const deleteOrganisationPermanently = vi.fn()

vi.mock('@/features/organisations/actions/organisations.actions', () => ({
  deleteOrganisationPermanently: (id: string) => deleteOrganisationPermanently(id),
  restoreOrganisation: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const organisation = {
  id: 'org-1',
  name: 'Acme Ltd',
  type: 'Corporate',
  deletedAt: Date.now(),
} as unknown as OrganisationListItem

describe('ArchivedOrganisationsTable permanent delete', () => {
  beforeEach(() => {
    deleteOrganisationPermanently.mockReset()
    deleteOrganisationPermanently.mockResolvedValue({ success: true })
  })

  it('does not delete on a double-click of "Delete permanently"', async () => {
    const user = userEvent.setup()
    render(<ArchivedOrganisationsTable organisations={[organisation]} />)

    await user.dblClick(screen.getByRole('button', { name: 'Delete permanently' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(deleteOrganisationPermanently).not.toHaveBeenCalled()
  })

  it('keeps the delete disabled until the name is typed', async () => {
    const user = userEvent.setup()
    render(<ArchivedOrganisationsTable organisations={[organisation]} />)

    await user.click(screen.getByRole('button', { name: 'Delete permanently' }))
    const dialog = screen.getByRole('dialog')
    const confirm = dialog.querySelector('button[type="submit"]') as HTMLButtonElement

    expect(confirm).toBeDisabled()
    await user.type(screen.getByLabelText(/to confirm/), 'Acme')
    expect(confirm).toBeDisabled()

    await user.type(screen.getByLabelText(/to confirm/), ' Ltd')
    expect(confirm).toBeEnabled()
    await user.click(confirm)

    expect(deleteOrganisationPermanently).toHaveBeenCalledWith('org-1')
  })

  it('closes without deleting on Cancel', async () => {
    const user = userEvent.setup()
    render(<ArchivedOrganisationsTable organisations={[organisation]} />)

    await user.click(screen.getByRole('button', { name: 'Delete permanently' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(deleteOrganisationPermanently).not.toHaveBeenCalled()
  })
})
