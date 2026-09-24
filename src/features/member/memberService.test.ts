import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '../../types/database'
import { createSupabaseMemberService } from './memberService'

function authClient(
  sessionUserId: string | null,
  userError: { message: string; name: string; status: number } | null = null,
) {
  const getSession = vi.fn(async () => ({
    data: {
      session: sessionUserId ? { user: { id: sessionUserId } } : null,
    },
    error: null,
  }))
  const signInAnonymously = vi.fn(async () => ({
    data: { user: { id: 'new-anonymous-user' } },
    error: null,
  }))
  const getUser = vi.fn(async () => ({
    data: { user: sessionUserId && !userError ? { id: sessionUserId } : null },
    error: userError,
  }))
  const signOut = vi.fn(async () => ({ error: null }))
  const rpc = vi.fn(
    async (name: string): Promise<{ data: unknown; error: null }> => ({
      data: name === 'join_current_queue'
        ? [{ queue_entry_id: 'queue-1', player_id: 'player-1', session_id: 'session-1', status: 'waiting' }]
        : null,
      error: null,
    }),
  )
  const client = {
    auth: { getSession, getUser, signInAnonymously, signOut },
    rpc,
  } as unknown as SupabaseClient<Database>

  return { client, getSession, getUser, signInAnonymously, signOut, rpc }
}

describe('Supabase member service', () => {
  it('restores an existing browser session without creating another anonymous user', async () => {
    const { client, getSession, getUser, signInAnonymously } = authClient('existing-user')

    await expect(createSupabaseMemberService(client).ensureAuthenticated()).resolves.toBe(
      'existing-user',
    )
    expect(getSession).toHaveBeenCalledOnce()
    expect(getUser).toHaveBeenCalledOnce()
    expect(signInAnonymously).not.toHaveBeenCalled()
  })

  it('replaces a stale anonymous session before loading protected member data', async () => {
    const { client, signInAnonymously, signOut } = authClient('deleted-user', {
      message: 'User from sub claim in JWT does not exist',
      name: 'AuthApiError',
      status: 403,
    })

    await expect(createSupabaseMemberService(client).ensureAuthenticated()).resolves.toBe(
      'new-anonymous-user',
    )
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(signInAnonymously).toHaveBeenCalledOnce()
  })

  it('does not replace a valid identity for a retryable auth failure', async () => {
    const { client, signInAnonymously, signOut } = authClient('existing-user', {
      message: 'Network request failed',
      name: 'AuthRetryableFetchError',
      status: 0,
    })

    await expect(createSupabaseMemberService(client).ensureAuthenticated()).rejects.toThrow(
      'Network request failed',
    )
    expect(signOut).not.toHaveBeenCalled()
    expect(signInAnonymously).not.toHaveBeenCalled()
  })

  it('rejects a join response that omits the authoritative queue entry', async () => {
    const { client, rpc } = authClient('existing-user')
    rpc.mockResolvedValueOnce({ data: [], error: null })

    await expect(
      createSupabaseMemberService(client).joinQueue('Ian H.', 'intermediate'),
    ).rejects.toThrow('did not return the authoritative queue entry')
  })

  it('creates an anonymous user only when no stored session exists', async () => {
    const { client, signInAnonymously } = authClient(null)

    await expect(createSupabaseMemberService(client).ensureAuthenticated()).resolves.toBe(
      'new-anonymous-user',
    )
    expect(signInAnonymously).toHaveBeenCalledOnce()
  })

  it('uses only the approved member RPCs for mutations', async () => {
    const { client, rpc } = authClient('existing-user')
    const service = createSupabaseMemberService(client)

    await service.joinQueue('Ian H.', 'intermediate')
    await service.leaveQueue()

    expect(rpc).toHaveBeenNthCalledWith(1, 'join_current_queue', {
      p_display_name: 'Ian H.',
      p_skill_level: 'intermediate',
    })
    expect(rpc).toHaveBeenNthCalledWith(2, 'leave_current_queue')
  })

  it('searches persistent profiles without linking or mutating an identity', async () => {
    const { client, rpc } = authClient('new-device-user')
    rpc.mockResolvedValueOnce({
      data: [
        {
          player_id: 'player-existing',
          display_name: 'Ian H.',
          skill_level: 'intermediate',
          last_joined_at: '2026-09-01T00:00:00.000Z',
        },
      ],
      error: null,
    })

    await expect(
      createSupabaseMemberService(client).searchProfiles(' Ian '),
    ).resolves.toEqual([
      {
        id: 'player-existing',
        displayName: 'Ian H.',
        skillLevel: 'intermediate',
        lastJoinedAt: '2026-09-01T00:00:00.000Z',
      },
    ])
    expect(rpc).toHaveBeenCalledOnce()
    expect(rpc).toHaveBeenCalledWith('search_member_profiles', {
      p_query: 'Ian',
    })
  })

  it('treats the already-linked target profile as an idempotent access request', async () => {
    const rpc = vi.fn(async (name: string) => name === 'submit_device_link_request'
      ? { data: null, error: { code: '23514', message: 'This device already has an approved profile.' } }
      : { data: [{ player_id: 'player-existing', display_name: 'Minh Duong', skill_level: 'advanced' }], error: null })
    const maybeSingle = vi.fn(async () => ({ data: { player_id: 'player-existing' }, error: null }))
    const client = {
      rpc,
      from: vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle })) })),
    } as unknown as SupabaseClient<Database>

    await expect(
      createSupabaseMemberService(client).submitDeviceLinkRequest?.('mvd38'),
    ).resolves.toBeUndefined()
  })

  it('keeps blocking access when the browser belongs to a different profile', async () => {
    const rpc = vi.fn(async (name: string) => name === 'submit_device_link_request'
      ? { data: null, error: { code: '23514', message: 'This device already has an approved profile.' } }
      : { data: [{ player_id: 'requested-player', display_name: 'Minh Duong', skill_level: 'advanced' }], error: null })
    const maybeSingle = vi.fn(async () => ({ data: { player_id: 'different-player' }, error: null }))
    const client = {
      rpc,
      from: vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle })) })),
    } as unknown as SupabaseClient<Database>

    await expect(
      createSupabaseMemberService(client).submitDeviceLinkRequest?.('mvd38'),
    ).rejects.toThrow('This browser is already linked to a different approved profile.')
  })

  it('owns one filtered live channel and removes it during cleanup', () => {
    const listeners: Array<{ table: string; filter?: string }> = []
    const removeChannel = vi.fn(async () => 'ok')
    const channel = {
      on: vi.fn(
        (
          _event: string,
          config: { table: string; filter?: string },
        ) => {
          listeners.push(config)
          return channel
        },
      ),
      subscribe: vi.fn((callback: (status: string) => void) => {
        callback('SUBSCRIBED')
        return channel
      }),
    }
    const client = {
      channel: vi.fn(() => channel),
      removeChannel,
    } as unknown as SupabaseClient<Database>
    const onStatus = vi.fn()

    const cleanup = createSupabaseMemberService(client).subscribe(
      'session-current',
      vi.fn(),
      onStatus,
    )

    expect(client.channel).toHaveBeenCalledWith('member:session-current:live-state')
    expect(onStatus).toHaveBeenCalledWith('connected')
    expect(listeners).toContainEqual({
      event: '*',
      schema: 'public',
      table: 'queue_entries',
      filter: 'session_id=eq.session-current',
    })
    expect(listeners.map(({ table }) => table)).not.toContain('player_identities')
    expect(listeners.map(({ table }) => table)).not.toContain('admin_users')

    cleanup()
    expect(removeChannel).toHaveBeenCalledWith(channel)
  })
})
