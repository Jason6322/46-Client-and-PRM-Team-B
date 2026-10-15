import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MultiSelect } from '@/components/shared/MultiSelect'

const options = [
  { value: 'u1', label: 'Jason' },
  { value: 'u2', label: 'Saneli' },
  { value: 'u3', label: 'Tommy Ngo' },
]

function Harness({ onBlur }: { onBlur?: () => void }) {
  const [value, setValue] = useState<string[]>([])
  return (
    <>
      <MultiSelect
        id="members"
        options={options}
        value={value}
        onChange={setValue}
        onBlur={onBlur}
        placeholder="Select team members"
      />
      <output data-testid="value">{value.join(',')}</output>
    </>
  )
}

describe('MultiSelect', () => {
  it('picks several options from the dropdown', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Select team members' }))
    await user.click(screen.getByRole('checkbox', { name: 'Jason' }))
    await user.click(screen.getByRole('checkbox', { name: 'Tommy Ngo' }))

    expect(screen.getByTestId('value')).toHaveTextContent('u1,u3')
    expect(screen.getByRole('button', { name: '2 selected' })).toBeInTheDocument()
  })

  it('removes one choice from its chip', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Select team members' }))
    await user.click(screen.getByRole('checkbox', { name: 'Jason' }))
    await user.click(screen.getByRole('checkbox', { name: 'Saneli' }))
    await user.click(screen.getByRole('button', { name: 'Remove Jason' }))

    expect(screen.getByTestId('value')).toHaveTextContent(/^u2$/)
  })

  it('closes on Escape and counts as leaving the field', async () => {
    const user = userEvent.setup()
    const onBlur = vi.fn()
    render(<Harness onBlur={onBlur} />)

    await user.click(screen.getByRole('button', { name: 'Select team members' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(onBlur).toHaveBeenCalled()
  })
})
