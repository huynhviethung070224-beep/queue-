import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { JoinQueueForm } from './JoinQueueForm'
import type { MemberProfile } from './memberService'

const createProps = () => ({
  onCreate: vi.fn(async () => undefined),
  onFind: vi.fn<(drexelUserId: string) => Promise<MemberProfile | null>>(async () => null),
  onRequestAccess: vi.fn(async () => undefined),
})

describe('JoinQueueForm', () => {
  it('submits a new Drexel profile for approval', async () => {
    const user = userEvent.setup(); const props = createProps()
    render(<JoinQueueForm {...props} />)
    await user.click(screen.getByRole('button', { name: 'Create new profile' }))
    await user.type(screen.getByLabelText('Drexel User ID'), 'VH358')
    await user.type(screen.getByLabelText('Display name'), 'Viet Hung')
    await user.click(screen.getByLabelText('advanced'))
    await user.click(screen.getByRole('button', { name: 'Submit for approval' }))
    expect(props.onCreate).toHaveBeenCalledWith('VH358', 'Viet Hung', 'advanced')
  })

  it('finds a profile by exact Drexel User ID and requests device access', async () => {
    const user = userEvent.setup(); const props = createProps()
    props.onFind.mockResolvedValue({ id: 'player-1', drexelUserId: 'vh358', displayName: 'Viet Hung', skillLevel: 'advanced' })
    render(<JoinQueueForm {...props} />)
    expect(screen.getByRole('heading', { name: 'Find my profile' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Drexel User ID'), 'vh358')
    await user.click(screen.getByRole('button', { name: 'Find profile' }))
    expect(await screen.findByText('We found your profile')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Request access' }))
    expect(props.onRequestAccess).toHaveBeenCalledWith('vh358')
  })

  it('explains what to do when no profile matches the Drexel User ID', async () => {
    const user = userEvent.setup(); const props = createProps()
    render(<JoinQueueForm {...props} />)

    await user.type(screen.getByLabelText('Drexel User ID'), 'abc123')
    await user.click(screen.getByRole('button', { name: 'Find profile' }))

    expect(await screen.findByText('No profile found')).toBeInTheDocument()
    expect(screen.getByText(/Check the ID, or create a new profile/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create a new profile' }))
    expect(screen.getByRole('heading', { name: 'Create your member profile' })).toBeInTheDocument()
    expect(screen.getByLabelText('Display name')).toBeInTheDocument()
  })
})
