import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaginatedList } from '@/components/shared/Pagination'

function items(count: number) {
  return Array.from({ length: count }, (_, index) => <li key={index}>Item {index + 1}</li>)
}

/** A list whose length can change, like one behind a search box. */
function Harness({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial)
  return (
    <>
      <button type="button" onClick={() => setCount(5)}>
        Filter
      </button>
      <PaginatedList storageKey="test" label="items">
        {items(count)}
      </PaginatedList>
    </>
  )
}

const shown = () => screen.getAllByRole('listitem').map((item) => item.textContent)

describe('PaginatedList', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows 20 per page by default and pages forward', async () => {
    render(<Harness initial={45} />)

    expect(shown()).toHaveLength(20)
    expect(screen.getByText('Showing 1–20 of 45 items')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(shown()[0]).toBe('Item 21')
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
  })

  it('stops at the last page', async () => {
    render(<Harness initial={25} />)

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(shown()).toEqual(['Item 21', 'Item 22', 'Item 23', 'Item 24', 'Item 25'])
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('changes and remembers the page size, back on page 1', async () => {
    render(<Harness initial={45} />)
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))

    await userEvent.selectOptions(screen.getByLabelText('Rows per page'), '50')

    expect(shown()).toHaveLength(45)
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    expect(window.localStorage.getItem('pageSize:test')).toBe('50')
  })

  it('uses a remembered page size', () => {
    window.localStorage.setItem('pageSize:test', '10')

    render(<Harness initial={45} />)

    expect(shown()).toHaveLength(10)
  })

  it('ignores a page size that is not one of the choices', () => {
    window.localStorage.setItem('pageSize:test', '1000')

    render(<Harness initial={45} />)

    expect(shown()).toHaveLength(20)
  })

  it('goes back to page 1 when the list changes', async () => {
    render(<Harness initial={45} />)
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))

    await userEvent.click(screen.getByRole('button', { name: 'Filter' }))

    expect(shown()[0]).toBe('Item 1')
    expect(screen.getByText('Showing 5 items')).toBeInTheDocument()
    expect(screen.queryByLabelText('Rows per page')).not.toBeInTheDocument()
  })
})
