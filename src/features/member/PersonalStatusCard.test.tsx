import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { QueuePlayer } from '../../types/domain'
import { PersonalStatusCard } from './PersonalStatusCard'

const calledPlayer: QueuePlayer = {
  id: 'player-current',
  displayName: 'Ian H.',
  skillLevel: 'intermediate',
  gamesPlayed: 1,
  queuedAt: '2026-08-24T22:50:00.000Z',
  waitMinutes: 12,
  status: 'called',
  courtNumber: 2,
}

describe('PersonalStatusCard', () => {
  it('clearly announces the assigned court for a called player', () => {
    render(<PersonalStatusCard player={calledPlayer} position={1} />)

    expect(
      screen.getByText('You have been called to Court 2. Please check in now.'),
    ).toHaveAttribute('role', 'status')
    expect(screen.getByText('Called')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Leave queue' })).not.toBeInTheDocument()
  })
})
