import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '../../types/database'
import { createSupabaseMemberService } from './memberService'

function authClient(sessionUserId: string | null) {
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
  const rpc = vi.fn(async () => ({ data: null, error: null }))
  const client = {
    auth: { getSession, signInAnonymously },
    rpc,
  } as unknown as SupabaseClient<Database>

  return { client, getSession, signInAnonymously, rpc }
}

describe('Supabase member service', () => {
  it('restores an existing browser session without creating another anonymous user', async () => {
    const { client, getSession, signInAnonymously } = authClient('existing-user')

    await expect(createSupabaseMemberService(client).ensureAuthenticated()).resolves.toBe(
      'existing-user',
    )
    expect(getSession).toHaveBeenCalledOnce()
    expect(signInAnonymously).not.toHaveBeenCalled()
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
