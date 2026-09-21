import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminCourtCard } from './AdminCourtCard'

describe('AdminCourtCard countdowns', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps independent match clocks and never ends a match automatically', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-21T00:10:00.000Z'))
    const onAction = vi.fn()

    const view = render(
      <>
        <AdminCourtCard
          court={{
            number: 1,
            name: 'Court 1',
            status: 'playing',
            activeMatchId: 'match-1',
            matchStartedAt: '2026-09-21T00:03:00.000Z',
            matchDurationSeconds: 420,
          }}
          onAction={onAction}
        />
        <AdminCourtCard
          court={{
            number: 2,
            name: 'Court 2',
            status: 'playing',
            activeMatchId: 'match-2',
            matchStartedAt: '2026-09-21T00:09:00.000Z',
            matchDurationSeconds: 420,
          }}
          onAction={onAction}
        />
      </>,
    )

    expect(screen.getByText('Time’s up')).toBeInTheDocument()
    expect(screen.getByText('6:00 remaining')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(screen.getByText('5:59 remaining')).toBeInTheDocument()

    view.rerender(
      <>
        <AdminCourtCard
          court={{
            number: 1,
            name: 'Court 1',
            status: 'playing',
            activeMatchId: 'match-1',
            matchStartedAt: '2026-09-21T00:03:00.000Z',
            matchDurationSeconds: 420,
          }}
          onAction={onAction}
        />
        <AdminCourtCard
          court={{
            number: 2,
            name: 'Court 2',
            status: 'playing',
            activeMatchId: 'match-2',
            matchStartedAt: '2026-09-21T00:09:00.000Z',
            matchDurationSeconds: 420,
          }}
          onAction={onAction}
        />
      </>,
    )
    expect(screen.getByText('5:59 remaining')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'End match' })).toHaveLength(2)
    expect(onAction).not.toHaveBeenCalled()
  })
})
