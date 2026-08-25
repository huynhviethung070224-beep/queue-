import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient } from '../../lib/supabase'
import type { Database, Tables } from '../../types/database'
import type { Court, QueuePlayer, SkillLevel } from '../../types/domain'
import { compareFairnessPriority } from '../queue/fairness'

type ClubSessionRow = Tables<'club_sessions'>
type CourtRow = Tables<'courts'>
type MatchPlayerRow = Tables<'match_players'>
type MatchRow = Tables<'matches'>
type PlayerRow = Tables<'players'>
type QueueEntryRow = Tables<'queue_entries'>
type SessionPlayerRow = Tables<'session_players'>

export type AdminConnectionStatus =
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'error'

export type AdminAuthState =
  | { status: 'signedOut' }
  | { status: 'authorized'; email: string }
  | { status: 'unauthorized'; email: string }

export interface AdminSession {
  id: string
  name: string
  status: 'draft' | 'open' | 'closed'
  autoRequeue: boolean
  createdAt: string
  openedAt: string | null
}

export interface AdminCourt extends Court {
  activeMatchId?: string
}

export interface AdminSnapshot {
  activeSession: AdminSession | null
  draftSessions: AdminSession[]
  waitingPlayers: QueuePlayer[]
  courts: AdminCourt[]
}

export interface AdminService {
  getAuthState: () => Promise<AdminAuthState>
  subscribeAuth: (onChange: () => void) => () => void
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  loadSnapshot: () => Promise<AdminSnapshot>
  createSession: (name: string, autoRequeue: boolean) => Promise<string>
  openSession: (sessionId: string) => Promise<void>
  closeSession: (sessionId: string) => Promise<void>
  assignPlayers: (courtNumber: number, playerIds: string[]) => Promise<string>
  startMatch: (matchId: string) => Promise<void>
  cancelMatch: (matchId: string) => Promise<void>
  endMatch: (matchId: string, requeuePlayers: boolean) => Promise<void>
  removePlayer: (sessionId: string, playerId: string) => Promise<void>
  updatePlayer: (
    playerId: string,
    displayName: string,
    skillLevel: SkillLevel,
  ) => Promise<void>
  setCourtEnabled: (courtNumber: number, enabled: boolean) => Promise<void>
  subscribe: (
    sessionId: string | null,
    onChange: () => void,
    onStatus: (status: AdminConnectionStatus) => void,
  ) => () => void
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

function toCourtNumber(value: number): 1 | 2 | 3 | undefined {
  return value === 1 || value === 2 || value === 3 ? value : undefined
}

function toSession(row: ClubSessionRow): AdminSession {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    autoRequeue: row.auto_requeue,
    createdAt: row.created_at,
    openedAt: row.opened_at,
  }
}

function compareWaitingPlayers(
  left: QueueEntryRow,
  right: QueueEntryRow,
  sessionPlayers: Map<string, SessionPlayerRow>,
) {
  const leftStats = sessionPlayers.get(left.player_id)
  const rightStats = sessionPlayers.get(right.player_id)
  return compareFairnessPriority(
    {
      id: left.id,
      gamesPlayed: leftStats?.games_played ?? 0,
      lastMatchEndedAt: leftStats?.last_match_ended_at ?? null,
      queuedAt: left.queued_at,
    },
    {
      id: right.id,
      gamesPlayed: rightStats?.games_played ?? 0,
      lastMatchEndedAt: rightStats?.last_match_ended_at ?? null,
      queuedAt: right.queued_at,
    },
  )
}

function mapAdminSnapshot(
  sessions: ClubSessionRow[],
  courtRows: CourtRow[],
  playerRows: PlayerRow[],
  sessionPlayerRows: SessionPlayerRow[],
  queueRows: QueueEntryRow[],
  matchRows: MatchRow[],
  matchPlayerRows: MatchPlayerRow[],
): AdminSnapshot {
  const activeSessionRow = sessions.find((session) => session.status === 'open') ?? null
  const players = new Map(playerRows.map((player) => [player.id, player]))
  const sessionPlayers = new Map(
    sessionPlayerRows.map((player) => [player.player_id, player]),
  )
  const waitingRows = queueRows
    .filter((entry) => entry.status === 'waiting')
    .sort((left, right) => compareWaitingPlayers(left, right, sessionPlayers))
  const duplicateCounts = new Map<string, number>()
  for (const entry of waitingRows) {
    const name = players.get(entry.player_id)?.display_name
    if (name) duplicateCounts.set(name, (duplicateCounts.get(name) ?? 0) + 1)
  }
  const duplicateIndexes = new Map<string, number>()

  const waitingPlayers = waitingRows
    .map((entry): QueuePlayer | null => {
      const player = players.get(entry.player_id)
      if (!player) return null
      const duplicateIndex = (duplicateIndexes.get(player.display_name) ?? 0) + 1
      duplicateIndexes.set(player.display_name, duplicateIndex)

      return {
        id: player.id,
        displayName: player.display_name,
        ...((duplicateCounts.get(player.display_name) ?? 0) > 1
          ? { duplicateSuffix: `#${duplicateIndex}` }
          : {}),
        skillLevel: player.skill_level,
        gamesPlayed: sessionPlayers.get(player.id)?.games_played ?? 0,
        lastMatchEndedAt:
          sessionPlayers.get(player.id)?.last_match_ended_at ?? null,
        queuedAt: entry.queued_at,
        waitMinutes: Math.max(
          0,
          Math.floor((Date.now() - new Date(entry.queued_at).getTime()) / 60_000),
        ),
        status: 'waiting',
      }
    })
    .filter((player) => player !== null)

  const activeMatchByCourt = new Map(matchRows.map((match) => [match.court_number, match]))
  const courts = courtRows
    .map((court): AdminCourt | null => {
      const number = toCourtNumber(court.number)
      if (!number) return null
      const match = activeMatchByCourt.get(court.number)
      const playerNames = match
        ? matchPlayerRows
            .filter((matchPlayer) => matchPlayer.match_id === match.id)
            .map((matchPlayer) => players.get(matchPlayer.player_id)?.display_name)
            .filter((name): name is string => Boolean(name))
        : []

      return {
        number,
        name: court.name,
        status: court.status,
        ...(match ? { activeMatchId: match.id } : {}),
        ...(match?.started_at ? { matchStartedAt: match.started_at } : {}),
        ...(playerNames.length ? { playerNames } : {}),
      }
    })
    .filter((court) => court !== null)

  return {
    activeSession: activeSessionRow ? toSession(activeSessionRow) : null,
    draftSessions: sessions
      .filter((session) => session.status === 'draft')
      .map(toSession),
    waitingPlayers,
    courts,
  }
}

export function createSupabaseAdminService(
  client: SupabaseClient<Database> = getSupabaseAdminClient(),
): AdminService {
  async function assertAuthorized() {
    const { data, error } = await client.rpc('is_current_user_admin')
    throwIfError(error)
    if (!data) throw new Error('This account is not authorized as a club administrator.')
  }

  return {
    async getAuthState() {
      const { data, error } = await client.auth.getSession()
      throwIfError(error)
      const user = data.session?.user
      if (!user || user.is_anonymous) return { status: 'signedOut' }

      const { data: isAdmin, error: adminError } = await client.rpc(
        'is_current_user_admin',
      )
      throwIfError(adminError)
      const email = user.email ?? 'Signed-in account'
      return isAdmin
        ? { status: 'authorized', email }
        : { status: 'unauthorized', email }
    },

    subscribeAuth(onChange) {
      const { data } = client.auth.onAuthStateChange(() => onChange())
      return () => data.subscription.unsubscribe()
    },

    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password })
      throwIfError(error)
      try {
        await assertAuthorized()
      } catch (authorizationError) {
        await client.auth.signOut({ scope: 'local' })
        throw authorizationError
      }
    },

    async signOut() {
      const { error } = await client.auth.signOut({ scope: 'local' })
      throwIfError(error)
    },

    async loadSnapshot() {
      await assertAuthorized()
      const [sessionsResult, courtsResult] = await Promise.all([
        client
          .from('club_sessions')
          .select('*')
          .in('status', ['draft', 'open'])
          .order('created_at', { ascending: false }),
        client.from('courts').select('*').order('number'),
      ])
      throwIfError(sessionsResult.error)
      throwIfError(courtsResult.error)

      const sessions = sessionsResult.data ?? []
      const activeSession = sessions.find((session) => session.status === 'open')
      if (!activeSession) {
        return mapAdminSnapshot(sessions, courtsResult.data ?? [], [], [], [], [], [])
      }

      const [players, sessionPlayers, queue, matches, matchPlayers] =
        await Promise.all([
          client.from('players').select('*'),
          client
            .from('session_players')
            .select('*')
            .eq('session_id', activeSession.id),
          client
            .from('queue_entries')
            .select('*')
            .eq('session_id', activeSession.id)
            .in('status', ['waiting', 'called', 'playing']),
          client
            .from('matches')
            .select('*')
            .eq('session_id', activeSession.id)
            .in('status', ['called', 'playing']),
          client
            .from('match_players')
            .select('*')
            .eq('session_id', activeSession.id)
            .is('released_at', null),
        ])
      for (const result of [players, sessionPlayers, queue, matches, matchPlayers]) {
        throwIfError(result.error)
      }

      return mapAdminSnapshot(
        sessions,
        courtsResult.data ?? [],
        players.data ?? [],
        sessionPlayers.data ?? [],
        queue.data ?? [],
        matches.data ?? [],
        matchPlayers.data ?? [],
      )
    },

    async createSession(name, autoRequeue) {
      const { data, error } = await client.rpc('create_club_session', {
        p_name: name,
        p_auto_requeue: autoRequeue,
      })
      throwIfError(error)
      if (!data) throw new Error('Session creation did not return an ID.')
      return data
    },
    async openSession(sessionId) {
      const { error } = await client.rpc('open_club_session', {
        p_session_id: sessionId,
      })
      throwIfError(error)
    },
    async closeSession(sessionId) {
      const { error } = await client.rpc('close_club_session', {
        p_session_id: sessionId,
      })
      throwIfError(error)
    },
    async assignPlayers(courtNumber, playerIds) {
      const { data, error } = await client.rpc('assign_players_to_court', {
        p_court_number: courtNumber,
        p_player_ids: playerIds,
      })
      throwIfError(error)
      if (!data) throw new Error('Player assignment did not return a match ID.')
      return data
    },
    async startMatch(matchId) {
      const { error } = await client.rpc('start_called_match', {
        p_match_id: matchId,
      })
      throwIfError(error)
    },
    async cancelMatch(matchId) {
      const { error } = await client.rpc('cancel_called_match', {
        p_match_id: matchId,
      })
      throwIfError(error)
    },
    async endMatch(matchId, requeuePlayers) {
      const { error } = await client.rpc('end_playing_match', {
        p_match_id: matchId,
        p_requeue_players: requeuePlayers,
      })
      throwIfError(error)
    },
    async removePlayer(sessionId, playerId) {
      const { error } = await client.rpc('admin_remove_player', {
        p_session_id: sessionId,
        p_player_id: playerId,
      })
      throwIfError(error)
    },
    async updatePlayer(playerId, displayName, skillLevel) {
      const { error } = await client.rpc('admin_update_player', {
        p_player_id: playerId,
        p_display_name: displayName,
        p_skill_level: skillLevel,
      })
      throwIfError(error)
    },
    async setCourtEnabled(courtNumber, enabled) {
      const { error } = await client.rpc('set_court_enabled', {
        p_court_number: courtNumber,
        p_enabled: enabled,
      })
      throwIfError(error)
    },

    subscribe(sessionId, onChange, onStatus) {
      let refreshTimer: ReturnType<typeof setTimeout> | null = null
      let channel: RealtimeChannel = client.channel(
        `admin:${sessionId ?? 'no-session'}:live-state`,
      )
      const scheduleRefresh = () => {
        if (refreshTimer) clearTimeout(refreshTimer)
        refreshTimer = setTimeout(onChange, 100)
      }
      const listen = (table: string, filter?: string) => {
        channel = channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
          scheduleRefresh,
        )
      }

      listen('club_sessions')
      listen('courts')
      listen('players')
      if (sessionId) {
        const filter = `session_id=eq.${sessionId}`
        for (const table of ['session_players', 'queue_entries', 'matches', 'match_players']) {
          listen(table, filter)
        }
      }

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          onStatus('connected')
          scheduleRefresh()
        } else if (status === 'CHANNEL_ERROR') {
          onStatus('error')
        } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
          onStatus('reconnecting')
        }
      })

      return () => {
        if (refreshTimer) clearTimeout(refreshTimer)
        void client.removeChannel(channel)
      }
    },
  }
}
