import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { QueuePlayer } from '../../types/domain'
import { EditPlayerDialog } from './EditPlayerDialog'

const waitingPlayer: QueuePlayer = {
  id: 'player-1',
  displayName: 'Ian H.',
  skillLevel: 'intermediate',
  gamesPlayed: 0,
  lastMatchEndedAt: null,
  queuedAt: '2026-08-25T00:00:00.000Z',
  waitMinutes: 10,
  status: 'waiting',
}

describe('EditPlayerDialog', () => {
  it('shows an accessible error instead of silently ignoring an invalid name', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <EditPlayerDialog
        player={waitingPlayer}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    )

    const nameInput = screen.getByLabelText('Display name')
    await user.clear(nameInput)
    await user.type(nameInput, 'I')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Display name must contain between 2 and 40 characters.',
    )
    expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    expect(onSave).not.toHaveBeenCalled()
  })
})
