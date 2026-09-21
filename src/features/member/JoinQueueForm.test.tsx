import { render, screen, waitFor } from '@testing-library/react'
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

  it('requests admin ownership verification instead of linking by name', async () => {
    const user = userEvent.setup()
    const onJoin = vi.fn()
    const onRequestProfileLink = vi.fn(async () => undefined)
    const onSearchProfiles = vi.fn(async () => [
      {
        id: 'player-1',
        displayName: 'Alex K.',
        skillLevel: 'beginner' as const,
        lastJoinedAt: null,
      },
      {
        id: 'player-2',
        displayName: 'Alex K.',
        skillLevel: 'advanced' as const,
        lastJoinedAt: null,
      },
    ])
    render(
      <JoinQueueForm
        onJoin={onJoin}
        onSearchProfiles={onSearchProfiles}
        onRequestProfileLink={onRequestProfileLink}
      />,
    )

    await user.type(screen.getByLabelText('Display name'), 'Alex')
    await user.click(screen.getByRole('button', { name: 'Search existing profiles' }))

    expect(await screen.findAllByText(/Alex K\./)).toHaveLength(2)
    await user.click(screen.getAllByRole('button', { name: 'Request access' })[0]!)
    expect(await screen.findByText(/Access request sent for Alex K/)).toBeInTheDocument()
    expect(onRequestProfileLink).toHaveBeenCalledWith('player-1', 'Alex K.')
    expect(onJoin).not.toHaveBeenCalled()
  })

  it('blocks an exact duplicate name and offers ownership verification', async () => {
    const user = userEvent.setup()
    const onJoin = vi.fn()
    render(
      <JoinQueueForm
        onJoin={onJoin}
        onSearchProfiles={vi.fn(async () => [{
          id: 'player-1', displayName: 'Ian H.', skillLevel: 'intermediate' as const, lastJoinedAt: null,
        }])}
        onRequestProfileLink={vi.fn(async () => undefined)}
      />,
    )

    await user.type(screen.getByLabelText('Display name'), 'Ian H.')
    await user.click(screen.getByRole('button', { name: 'Join queue' }))

    expect(await screen.findByText(/already in use/)).toBeInTheDocument()
    expect(onJoin).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Request access' })).toBeInTheDocument()
  })

  it('prefills a profile restored from the same browser identity', () => {
    render(
      <JoinQueueForm
        initialDisplayName="Ian H."
        initialSkillLevel="advanced"
        onJoin={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Display name')).toHaveValue('Ian H.')
    expect(screen.getByLabelText(/advanced/i)).toBeChecked()
    expect(screen.getByText(/Current profile: Ian H/)).toBeInTheDocument()
  })

  it('updates the input when the restored profile arrives after the first render', async () => {
    const { rerender } = render(<JoinQueueForm key="new" onJoin={vi.fn()} />)

    rerender(
      <JoinQueueForm
        key="restored-profile"
        initialDisplayName="xx"
        initialSkillLevel="advanced"
        onJoin={vi.fn()}
      />,
    )

    await waitFor(() => expect(screen.getByLabelText('Display name')).toHaveValue('xx'))
    expect(screen.getByLabelText(/advanced/i)).toBeChecked()
  })
})
