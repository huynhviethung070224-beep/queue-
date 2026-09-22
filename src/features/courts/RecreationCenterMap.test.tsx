import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Court, QueuePlayer } from '../../types/domain'
import { RecreationCenterMap } from './RecreationCenterMap'

const courts: Court[] = [
  { number: 1, name: 'Court 1', status: 'available' },
  { number: 2, name: 'Court 2', status: 'disabled' },
  { number: 3, name: 'Court 3', status: 'playing' },
]

function player(status: QueuePlayer['status'], courtNumber?: 1 | 2 | 3): QueuePlayer {
  return {
    id: 'member-1', displayName: 'Member', skillLevel: 'intermediate', gamesPlayed: 0,
    queuedAt: '2026-09-22T12:00:00.000Z', waitMinutes: 2, status,
    ...(courtNumber ? { courtNumber } : {}),
  }
}

describe('RecreationCenterMap', () => {
  it('renders Court 3, Court 2, Court 1, then the entrance in physical order', () => {
    render(<RecreationCenterMap courts={courts} member={null} />)
    const map = screen.getByTestId('court-map-layout')
    expect(within(map).getAllByRole('article').map((court) => court.getAttribute('data-court-number'))).toEqual(['3', '2', '1'])
    expect(within(map).getByLabelText('Recreation center entrance')).toBeInTheDocument()
    expect(map.textContent).toMatch(/Court 3.*Intermediate.*Court 2.*Beginner.*Court 1.*Advanced.*Entrance/i)
  })

  it('does not highlight a court while the member is waiting', () => {
    render(<RecreationCenterMap courts={courts} member={player('waiting')} />)
    expect(document.querySelector('[data-assigned="true"]')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('You are currently waiting for a court assignment.')
  })

  it.each(['called', 'playing'] as const)('highlights the authoritative court while %s', (status) => {
    render(<RecreationCenterMap courts={courts} member={player(status, 2)} />)
    expect(screen.getByLabelText(/Court 2 — Beginner: disabled, your court/i)).toHaveAttribute('data-assigned', 'true')
    expect(screen.getByText('Your court')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('You are assigned to Court 2 — Beginner.')
  })

  it('removes the highlight after cancellation or match end is confirmed', () => {
    const view = render(<RecreationCenterMap courts={courts} member={player('called', 1)} />)
    expect(document.querySelector('[data-assigned="true"]')).toBeInTheDocument()
    view.rerender(<RecreationCenterMap courts={courts} member={player('waiting')} />)
    expect(document.querySelector('[data-assigned="true"]')).not.toBeInTheDocument()
  })

  it('uses reduced-motion and mobile-safe layout utilities', () => {
    render(<RecreationCenterMap courts={courts} member={player('playing', 3)} />)
    expect(screen.getByLabelText(/Court 3.*your court/i)).toHaveClass('motion-reduce:animate-none')
    expect(screen.getByTestId('court-map-layout')).toHaveClass('w-full', 'min-w-0', 'overflow-hidden')
  })
})
