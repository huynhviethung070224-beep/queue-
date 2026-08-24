import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { JoinQueueForm } from './JoinQueueForm'

describe('JoinQueueForm', () => {
  it('validates the display name before joining', async () => {
    const user = userEvent.setup()
    const onJoin = vi.fn()
    render(<JoinQueueForm onJoin={onJoin} />)

    await user.type(screen.getByLabelText('Display name'), 'I')
    await user.click(screen.getByRole('button', { name: 'Join queue' }))

    expect(
      screen.getByText('Enter a display name between 2 and 40 characters.'),
    ).toBeInTheDocument()
    expect(onJoin).not.toHaveBeenCalled()
  })

  it('submits a trimmed name and selected skill level', async () => {
    const user = userEvent.setup()
    const onJoin = vi.fn()
    render(<JoinQueueForm onJoin={onJoin} />)

    await user.type(screen.getByLabelText('Display name'), '  Ian H.  ')
    await user.click(screen.getByLabelText(/advanced/i))
    await user.click(screen.getByRole('button', { name: 'Join queue' }))

    expect(onJoin).toHaveBeenCalledWith('Ian H.', 'advanced')
  })
})
