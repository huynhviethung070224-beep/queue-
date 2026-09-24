import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminMember } from './adminService'
import { MemberDirectory } from './MemberDirectory'

const activeMember: AdminMember = {
  id: 'player-active',
  displayName: 'Active Player',
  skillLevel: 'intermediate',
  isPaid: true,
  isArchived: false,
  isActive: true,
  createdAt: '2026-09-22T00:00:00.000Z',
  lastJoinedAt: '2026-09-22T01:00:00.000Z',
}

describe('MemberDirectory', () => {
  it('prevents delete and archive requests while a member has an active queue state', () => {
    render(
      <MemberDirectory
        members={[activeMember]}
        pendingAction={null}
        onSetPayment={vi.fn()}
        onDelete={vi.fn()}
        onSetArchived={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Currently in live queue or match')).toHaveTextContent('Live')
    const actions = screen.getByRole('group', { name: 'Actions for Active Player' })
    expect(within(actions).getByRole('button', { name: 'Permanently delete' })).toBeDisabled()
    expect(within(actions).getByRole('button', { name: 'Archive member' })).toBeDisabled()
    expect(screen.queryByText(/Remove this member from the queue/)).not.toBeInTheDocument()
  })
})
