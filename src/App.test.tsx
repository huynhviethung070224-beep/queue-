import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { AdminService, AdminSnapshot } from './features/admin/adminService'
import type { MemberService, MemberSnapshot } from './features/member/memberService'
import type { QueuePlayer, SkillLevel } from './types/domain'

const waitingPlayer: QueuePlayer = {
  id: 'player-current',
  displayName: 'Ian H.',
  skillLevel: 'intermediate',
  gamesPlayed: 0,
  queuedAt: new Date().toISOString(),
  waitMinutes: 0,
  status: 'waiting',
}

function snapshot(member: QueuePlayer | null = null): MemberSnapshot {
  return {
    session: {
      id: 'session-current',
      name: 'Monday Club Night',
      status: 'open',
      openedAt: new Date().toISOString(),
      autoRequeue: true,
    },
    member,
    queuePosition: member ? 1 : null,
    queue: member ? [member] : [],
    courts: [
      { number: 1, name: 'Court 1', status: 'available' },
      { number: 2, name: 'Court 2', status: 'available' },
      { number: 3, name: 'Court 3', status: 'available' },
    ],
  }
}

function createMemberService() {
  let currentMember: QueuePlayer | null = null
  let changeListener: (() => void) | null = null
  const cleanup = vi.fn()

  const service: MemberService = {
    ensureAuthenticated: vi.fn(async () => 'auth-user'),
    loadSnapshot: vi.fn(async () => snapshot(currentMember)),
    joinQueue: vi.fn(async (displayName: string, skillLevel: SkillLevel) => {
      currentMember = { ...waitingPlayer, displayName, skillLevel }
    }),
    leaveQueue: vi.fn(async () => {
      currentMember = null
    }),
    subscribe: vi.fn((_sessionId, onChange, onStatus) => {
      changeListener = onChange
      onStatus('connected')
      return cleanup
    }),
  }

  return { service, cleanup, emitChange: () => changeListener?.() }
}

function adminSnapshot(): AdminSnapshot {
  return {
    activeSession: {
      id: 'session-current',
      name: 'Monday Club Night',
      status: 'open',
      autoRequeue: true,
      createdAt: '2026-08-24T22:00:00.000Z',
      openedAt: '2026-08-24T22:00:00.000Z',
    },
    draftSessions: [],
    waitingPlayers: [
      waitingPlayer,
      { ...waitingPlayer, id: 'player-2', displayName: 'Alex K.' },
      { ...waitingPlayer, id: 'player-3', displayName: 'Priya S.' },
      { ...waitingPlayer, id: 'player-4', displayName: 'Jordan L.' },
    ],
    courts: [
      { number: 1, name: 'Court 1', status: 'available' },
      { number: 2, name: 'Court 2', status: 'available' },
      { number: 3, name: 'Court 3', status: 'disabled' },
    ],
  }
}

function createAdminService(initialStatus: 'signedOut' | 'authorized' | 'unauthorized' = 'signedOut') {
  let authStatus = initialStatus
  let authListener: (() => void) | null = null
  const authCleanup = vi.fn()
  const realtimeCleanup = vi.fn()
  const service: AdminService = {
    getAuthState: vi.fn(async () =>
      authStatus === 'authorized'
        ? { status: 'authorized' as const, email: 'admin@drexel.edu' }
        : authStatus === 'unauthorized'
          ? { status: 'unauthorized' as const, email: 'student@drexel.edu' }
          : { status: 'signedOut' as const },
    ),
    subscribeAuth: vi.fn((onChange) => {
      authListener = onChange
      return authCleanup
    }),
    signIn: vi.fn(async () => {
      authStatus = 'authorized'
      authListener?.()
    }),
    signOut: vi.fn(async () => {
      authStatus = 'signedOut'
      authListener?.()
    }),
    loadSnapshot: vi.fn(async () => adminSnapshot()),
    createSession: vi.fn(async () => 'session-new'),
    openSession: vi.fn(async () => undefined),
    closeSession: vi.fn(async () => undefined),
    assignPlayers: vi.fn(async () => 'match-new'),
    startMatch: vi.fn(async () => undefined),
    cancelMatch: vi.fn(async () => undefined),
    endMatch: vi.fn(async () => undefined),
    removePlayer: vi.fn(async () => undefined),
    updatePlayer: vi.fn(async () => undefined),
    setCourtEnabled: vi.fn(async () => undefined),
    subscribe: vi.fn((_sessionId, _onChange, onStatus) => {
      onStatus('connected')
      return realtimeCleanup
    }),
  }
  return { service, authCleanup, realtimeCleanup }
}

function renderRoute(
  path: string,
  memberService?: MemberService,
  adminService?: AdminService,
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App memberService={memberService} adminService={adminService} />
    </MemoryRouter>,
  )
}

describe('application routes and major states', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('lets a member move from the join form to personal waiting status', async () => {
    const user = userEvent.setup()
    const { service } = createMemberService()
    renderRoute('/', service)

    await user.type(await screen.findByLabelText('Display name'), 'Ian H.')
    await user.click(screen.getByRole('button', { name: 'Join queue' }))

    expect(await screen.findByRole('heading', { name: 'Ian H.' })).toBeInTheDocument()
    expect(screen.getByText('Waiting')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leave queue' })).toBeEnabled()
    expect(service.joinQueue).toHaveBeenCalledWith('Ian H.', 'intermediate')

    await user.click(screen.getByRole('button', { name: 'Leave queue' }))
    expect(await screen.findByRole('button', { name: 'Join queue' })).toBeEnabled()
    expect(service.leaveQueue).toHaveBeenCalledOnce()
  })

  it('refetches on a live event and cleans up the subscription', async () => {
    const { service, cleanup, emitChange } = createMemberService()
    const view = renderRoute('/', service)

    await screen.findByRole('heading', { name: 'Monday Club Night' })
    expect(service.loadSnapshot).toHaveBeenCalledOnce()

    act(() => emitChange())
    await waitFor(() => expect(service.loadSnapshot).toHaveBeenCalledTimes(2))

    view.unmount()
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('keeps the last snapshot offline and refetches after reconnect', async () => {
    const { service } = createMemberService()
    renderRoute('/', service)

    await screen.findByRole('heading', { name: 'Monday Club Night' })
    act(() => window.dispatchEvent(new Event('offline')))

    expect(screen.getByText(/You are offline/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Join queue' })).toBeDisabled()

    act(() => window.dispatchEvent(new Event('online')))
    await waitFor(() => expect(service.loadSnapshot).toHaveBeenCalledTimes(2))
  })

  it('explains local setup when Supabase environment values are absent', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    renderRoute('/')

    expect(
      screen.getByRole('heading', { name: 'Connect Supabase to use the member queue' }),
    ).toBeInTheDocument()
  })

  it('shows the empty state when no club session is open', async () => {
    const { service } = createMemberService()
    service.loadSnapshot = vi.fn(async () => ({
      ...snapshot(),
      session: null,
      queue: [],
    }))
    renderRoute('/', service)

    expect(
      await screen.findByRole('heading', { name: 'Club night is not open yet' }),
    ).toBeInTheDocument()
    expect(screen.getByText('The queue is currently closed')).toBeInTheDocument()
  })

  it('offers a retry when the server snapshot cannot load', async () => {
    const { service } = createMemberService()
    service.loadSnapshot = vi.fn(async () => {
      throw new Error('Database unavailable')
    })
    renderRoute('/', service)

    expect(
      await screen.findByRole('heading', { name: 'We could not load the club queue' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Database unavailable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled()
  })

  it('redirects a signed-out admin and opens the database-authorized dashboard after sign in', async () => {
    const user = userEvent.setup()
    const { service } = createAdminService()
    renderRoute('/admin', undefined, service)

    expect(await screen.findByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Email address'), 'admin@drexel.edu')
    await user.type(screen.getByLabelText('Password'), 'secure-password')
    await user.click(screen.getByRole('button', { name: 'Sign in securely' }))

    expect(
      await screen.findByRole('heading', { name: 'Club night control desk' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Recommended next group')).toBeInTheDocument()
    expect(service.signIn).toHaveBeenCalledWith('admin@drexel.edu', 'secure-password')
  })

  it('calls the atomic assignment RPC once for four selected players', async () => {
    const user = userEvent.setup()
    const { service } = createAdminService('authorized')
    renderRoute('/admin', undefined, service)

    await screen.findByRole('heading', { name: 'Club night control desk' })
    await user.click(screen.getByRole('button', { name: 'Select recommended four' }))
    await user.click(screen.getByRole('button', { name: 'Call four players' }))

    await waitFor(() =>
      expect(service.assignPlayers).toHaveBeenCalledWith(
        1,
        expect.arrayContaining([
          'player-current',
          'player-2',
          'player-3',
          'player-4',
        ]),
      ),
    )
    expect(service.assignPlayers).toHaveBeenCalledOnce()
  })

  it('blocks duplicate assignment submissions while the first RPC is pending', async () => {
    const user = userEvent.setup()
    const { service } = createAdminService('authorized')
    let finishAssignment: ((matchId: string) => void) | null = null
    service.assignPlayers = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finishAssignment = resolve
        }),
    )
    renderRoute('/admin', undefined, service)

    await screen.findByRole('heading', { name: 'Club night control desk' })
    await user.click(screen.getByRole('button', { name: 'Select recommended four' }))
    const callButton = screen.getByRole('button', { name: 'Call four players' })
    await user.dblClick(callButton)

    expect(service.assignPlayers).toHaveBeenCalledOnce()
    expect(callButton).toBeDisabled()

    act(() => finishAssignment?.('match-new'))
    expect(await screen.findByText('Four players were called to Court 1.')).toBeInTheDocument()
    expect(service.assignPlayers).toHaveBeenCalledOnce()
  })

  it('starts a called match using its authoritative match ID', async () => {
    const user = userEvent.setup()
    const { service } = createAdminService('authorized')
    const calledSnapshot = adminSnapshot()
    calledSnapshot.waitingPlayers = []
    calledSnapshot.courts[0] = {
      number: 1,
      name: 'Court 1',
      status: 'called',
      activeMatchId: 'match-called',
      playerNames: ['Ian', 'Alex', 'Priya', 'Jordan'],
    }
    service.loadSnapshot = vi.fn(async () => calledSnapshot)
    renderRoute('/admin', undefined, service)

    await user.click(await screen.findByRole('button', { name: 'Start' }))
    await waitFor(() => expect(service.startMatch).toHaveBeenCalledWith('match-called'))
  })

  it('requires confirmation before cancelling a called match', async () => {
    const user = userEvent.setup()
    const { service } = createAdminService('authorized')
    const calledSnapshot = adminSnapshot()
    calledSnapshot.waitingPlayers = []
    calledSnapshot.courts[0] = {
      number: 1,
      name: 'Court 1',
      status: 'called',
      activeMatchId: 'match-called',
      playerNames: ['Ian', 'Alex', 'Priya', 'Jordan'],
    }
    service.loadSnapshot = vi.fn(async () => calledSnapshot)
    renderRoute('/admin', undefined, service)

    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel call' }))
    await waitFor(() => expect(service.cancelMatch).toHaveBeenCalledWith('match-called'))
  })

  it('ends a playing match with the selected requeue behavior', async () => {
    const user = userEvent.setup()
    const { service } = createAdminService('authorized')
    const playingSnapshot = adminSnapshot()
    playingSnapshot.waitingPlayers = []
    playingSnapshot.courts[0] = {
      number: 1,
      name: 'Court 1',
      status: 'playing',
      activeMatchId: 'match-playing',
      matchStartedAt: '2026-08-24T22:00:00.000Z',
      playerNames: ['Ian', 'Alex', 'Priya', 'Jordan'],
    }
    service.loadSnapshot = vi.fn(async () => playingSnapshot)
    renderRoute('/admin', undefined, service)

    await user.click(await screen.findByRole('button', { name: 'End match' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'End match' }),
    )
    await waitFor(() =>
      expect(service.endMatch).toHaveBeenCalledWith('match-playing', true),
    )
  })

  it('does not render the protected dashboard for a non-admin account', async () => {
    const { service } = createAdminService('unauthorized')
    renderRoute('/admin', undefined, service)

    expect(await screen.findByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument()
    expect(screen.getByText(/is signed in but is not listed/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Club night control desk' })).not.toBeInTheDocument()
  })

  it('cleans up admin Auth and Realtime subscriptions on unmount', async () => {
    const { service, authCleanup, realtimeCleanup } = createAdminService('authorized')
    const view = renderRoute('/admin', undefined, service)

    await screen.findByRole('heading', { name: 'Club night control desk' })
    view.unmount()

    expect(authCleanup).toHaveBeenCalledOnce()
    expect(realtimeCleanup).toHaveBeenCalledOnce()
  })

  it('shows a useful not-found page', () => {
    renderRoute('/missing-page')

    expect(
      screen.getByRole('heading', { name: 'This page is not on our court.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to member queue' })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
