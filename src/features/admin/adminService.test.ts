import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '../../types/database'
import { createSupabaseAdminService } from './adminService'

function createAuthClient(isAdmin: boolean) {
  const signInWithPassword = vi.fn(async () => ({ data: {}, error: null }))
  const signOut = vi.fn(async () => ({ error: null }))
  const rpc = vi.fn(async (name: string) => ({
    data:
      name === 'is_current_user_admin'
        ? isAdmin
        : name === 'create_club_session'
          ? 'session-new'
          : name === 'assign_players_to_court'
            ? 'match-new'
            : null,
    error: null,
  }))
  const client = {
    auth: { signInWithPassword, signOut },
    rpc,
  } as unknown as SupabaseClient<Database>
  return { client, signInWithPassword, signOut, rpc }
}

describe('Supabase admin service', () => {
  it('requires both password authentication and database admin membership', async () => {
    const { client, signInWithPassword, signOut } = createAuthClient(true)

    await createSupabaseAdminService(client).signIn(
      'admin@drexel.edu',
      'secure-password',
    )

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'admin@drexel.edu',
      password: 'secure-password',
    })
    expect(signOut).not.toHaveBeenCalled()
  })

  it('removes the local session when the authenticated account is not an admin', async () => {
    const { client, signOut } = createAuthClient(false)

    await expect(
      createSupabaseAdminService(client).signIn(
        'student@drexel.edu',
        'secure-password',
      ),
    ).rejects.toThrow('not authorized as a club administrator')
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('maps every dashboard mutation to its security-definer RPC', async () => {
    const { client, rpc } = createAuthClient(true)
    const service = createSupabaseAdminService(client)

    await service.createSession('Monday Club Night', true)
    await service.openSession('session-new')
    await service.closeSession('session-new')
    await service.assignPlayers(2, ['p1', 'p2', 'p3', 'p4'])
    await service.startMatch('match-new')
    await service.cancelMatch('match-new')
    await service.endMatch('match-new', true)
    await service.removePlayer('session-new', 'p1')
    await service.updatePlayer('p1', 'Ian H.', 'intermediate')
    await service.setCourtEnabled(3, false)

    expect(rpc).toHaveBeenCalledWith('create_club_session', {
      p_name: 'Monday Club Night',
      p_auto_requeue: true,
    })
    expect(rpc).toHaveBeenCalledWith('assign_players_to_court', {
      p_court_number: 2,
      p_player_ids: ['p1', 'p2', 'p3', 'p4'],
    })
    expect(rpc).toHaveBeenCalledWith('end_playing_match', {
      p_match_id: 'match-new',
      p_requeue_players: true,
    })
    expect(rpc).toHaveBeenCalledWith('admin_update_player', {
      p_player_id: 'p1',
      p_display_name: 'Ian H.',
      p_skill_level: 'intermediate',
    })
  })

  it('owns one session-filtered Realtime channel and removes it on cleanup', () => {
    const listeners: Array<{ table: string; filter?: string }> = []
    const removeChannel = vi.fn(async () => 'ok')
    const channel = {
      on: vi.fn((_event: string, config: { table: string; filter?: string }) => {
        listeners.push(config)
        return channel
      }),
      subscribe: vi.fn((callback: (status: string) => void) => {
        callback('SUBSCRIBED')
        return channel
      }),
    }
    const client = {
      channel: vi.fn(() => channel),
      removeChannel,
    } as unknown as SupabaseClient<Database>

    const cleanup = createSupabaseAdminService(client).subscribe(
      'session-current',
      vi.fn(),
      vi.fn(),
    )

    expect(client.channel).toHaveBeenCalledWith('admin:session-current:live-state')
    expect(listeners).toContainEqual({
      event: '*',
      schema: 'public',
      table: 'matches',
      filter: 'session_id=eq.session-current',
    })
    expect(listeners.map(({ table }) => table)).not.toContain('admin_users')
    cleanup()
    expect(removeChannel).toHaveBeenCalledWith(channel)
  })
})
