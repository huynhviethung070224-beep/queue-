import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../lib/supabase'
import type { Database, Tables } from '../../types/database'
import type { ClubSession, Court, QueuePlayer, SkillLevel } from '../../types/domain'
import { compareFairnessPriority } from '../queue/fairness'

type ClubSessionRow = Tables<'club_sessions'>
type CourtRow = Tables<'courts'>
type MatchPlayerRow = Tables<'match_players'>
type MatchRow = Tables<'matches'>
type PlayerRow = Tables<'players'>
type QueueEntryRow = Tables<'queue_entries'>
type SessionPlayerRow = Tables<'session_players'>

export type MemberConnectionStatus =
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'error'

export interface MemberSnapshot {
  session: ClubSession | null
  profile: MemberProfile | null
  member: QueuePlayer | null
  queuePosition: number | null
  queue: QueuePlayer[]
  courts: Court[]
  profileLinkRequest: ProfileLinkRequest | null
}

export interface MemberProfile {
  id: string
  displayName: string
  skillLevel: SkillLevel
}

export interface MemberProfileSuggestion extends MemberProfile {
  lastJoinedAt: string | null
}

export interface ProfileLinkRequest {
  id: string
  targetPlayerId: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reviewedAt: string | null
}

export interface MemberService {
  ensureAuthenticated: () => Promise<string>
  resetIdentity?: () => Promise<void>
  loadSnapshot: (userId: string) => Promise<MemberSnapshot>
  joinQueue: (displayName: string, skillLevel: SkillLevel) => Promise<void>
  leaveQueue: () => Promise<void>
  searchProfiles: (query: string) => Promise<MemberProfileSuggestion[]>
  requestProfileLink: (playerId: string) => Promise<void>
  getProfileLinkRequest: () => Promise<ProfileLinkRequest | null>
  subscribe: (
    sessionId: string | null,
    onChange: () => void,
    onStatus: (status: MemberConnectionStatus) => void,
  ) => () => void
}

const activeQueueStatuses = ['waiting', 'called', 'playing'] as const
const activeMatchStatuses = ['called', 'playing'] as const

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

function minutesSince(timestamp: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(timestamp).getTime()) / 60_000))
}

function toCourtNumber(value: number): 1 | 2 | 3 | undefined {
  return value === 1 || value === 2 || value === 3 ? value : undefined
}

function compareFairness(
  left: QueueEntryRow,
  right: QueueEntryRow,
  sessionPlayers: Map<string, SessionPlayerRow>,
) {
  const leftSession = sessionPlayers.get(left.player_id)
  const rightSession = sessionPlayers.get(right.player_id)
  return compareFairnessPriority(
    {
      id: left.id,
      gamesPlayed: leftSession?.games_played ?? 0,
      lastMatchEndedAt: leftSession?.last_match_ended_at ?? null,
      queuedAt: left.queued_at,
    },
    {
      id: right.id,
      gamesPlayed: rightSession?.games_played ?? 0,
      lastMatchEndedAt: rightSession?.last_match_ended_at ?? null,
      queuedAt: right.queued_at,
    },
  )
}

function buildSnapshot(
  sessionRow: ClubSessionRow,
  courtRows: CourtRow[],
  playerRows: PlayerRow[],
  sessionPlayerRows: SessionPlayerRow[],
  queueRows: QueueEntryRow[],
  matchRows: MatchRow[],
  matchPlayerRows: MatchPlayerRow[],
  ownPlayerId: string | null,
  profile: MemberProfile | null,
  profileLinkRequest: ProfileLinkRequest | null,
): MemberSnapshot {
  const players = new Map(playerRows.map((player) => [player.id, player]))
  const sessionPlayers = new Map(
    sessionPlayerRows.map((player) => [player.player_id, player]),
  )
  const matches = new Map(matchRows.map((match) => [match.id, match]))
  const matchPlayerByQueueEntry = new Map(
    matchPlayerRows.map((player) => [player.queue_entry_id, player]),
  )

  const waitingRows = queueRows
    .filter((entry) => entry.status === 'waiting')
    .sort((left, right) => compareFairness(left, right, sessionPlayers))

  const duplicateCounts = new Map<string, number>()
  for (const entry of waitingRows) {
    const name = players.get(entry.player_id)?.display_name
    if (name) duplicateCounts.set(name, (duplicateCounts.get(name) ?? 0) + 1)
  }
  const duplicateIndexes = new Map<string, number>()

  const toPlayer = (entry: QueueEntryRow): QueuePlayer | null => {
    const player = players.get(entry.player_id)
    if (!player) return null

    const matchPlayer = matchPlayerByQueueEntry.get(entry.id)
    const courtNumber = matchPlayer
      ? toCourtNumber(matches.get(matchPlayer.match_id)?.court_number ?? 0)
      : undefined
    const queuePlayer: QueuePlayer = {
      id: player.id,
      displayName: player.display_name,
      skillLevel: player.skill_level,
      gamesPlayed: sessionPlayers.get(player.id)?.games_played ?? 0,
      lastMatchEndedAt:
        sessionPlayers.get(player.id)?.last_match_ended_at ?? null,
      queuedAt: entry.queued_at,
      waitMinutes: minutesSince(entry.queued_at),
      status: entry.status as QueuePlayer['status'],
      ...(courtNumber ? { courtNumber } : {}),
    }

    if (entry.status === 'waiting' && (duplicateCounts.get(player.display_name) ?? 0) > 1) {
      const duplicateIndex = (duplicateIndexes.get(player.display_name) ?? 0) + 1
      duplicateIndexes.set(player.display_name, duplicateIndex)
      queuePlayer.duplicateSuffix = `#${duplicateIndex}`
    }

    return queuePlayer
  }

  const queue = waitingRows.map(toPlayer).filter((player) => player !== null)
  const ownEntry = queueRows.find((entry) => entry.player_id === ownPlayerId)
  const member = ownEntry ? toPlayer(ownEntry) : null
  const queuePosition = member?.status === 'waiting'
    ? queue.findIndex((player) => player.id === member.id) + 1
    : null

  const activeMatchByCourt = new Map(
    matchRows.map((match) => [match.court_number, match]),
  )
  const courts = courtRows
    .map((court): Court | null => {
      const number = toCourtNumber(court.number)
      if (!number) return null

      const match = activeMatchByCourt.get(court.number)
      const playerNames = match
        ? matchPlayerRows
            .filter((matchPlayer) => matchPlayer.match_id === match.id)
            .map((matchPlayer) => players.get(matchPlayer.player_id)?.display_name)
            .filter((name): name is string => Boolean(name))
        : undefined

      return {
        number,
        name: court.name,
        status: court.status,
        ...(match?.started_at ? { matchStartedAt: match.started_at } : {}),
        ...(match?.duration_seconds
          ? { matchDurationSeconds: match.duration_seconds }
          : {}),
        ...(playerNames?.length ? { playerNames } : {}),
      }
    })
    .filter((court) => court !== null)

  return {
    session: {
      id: sessionRow.id,
      name: sessionRow.name,
      status: 'open',
      openedAt: sessionRow.opened_at ?? sessionRow.created_at,
      autoRequeue: sessionRow.auto_requeue,
    },
    profile,
    member,
    queuePosition: queuePosition && queuePosition > 0 ? queuePosition : null,
    queue,
    courts,
    profileLinkRequest,
  }
}

export function createSupabaseMemberService(
  client: SupabaseClient<Database> = getSupabaseClient(),
): MemberService {
  return {
    async ensureAuthenticated() {
      const { data, error } = await client.auth.getSession()
      throwIfError(error)
      if (data.session?.user.id) return data.session.user.id

      const { data: signInData, error: signInError } = await client.auth.signInAnonymously()
      throwIfError(signInError)
      if (!signInData.user) throw new Error('Anonymous sign-in did not return a user.')
      return signInData.user.id
    },

    async resetIdentity() {
      const { error } = await client.auth.signOut()
      throwIfError(error)
    },

    async loadSnapshot(userId) {
      const [sessionResult, courtsResult, identityResult, linkRequestResult] = await Promise.all([
        client
          .from('club_sessions')
          .select('*')
          .eq('status', 'open')
          .order('opened_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        client.from('courts').select('*').order('number'),
        client
          .from('player_identities')
          .select('player_id')
          .eq('auth_user_id', userId)
          .maybeSingle(),
        client.rpc('get_my_profile_link_request'),
      ])

      throwIfError(sessionResult.error)
      throwIfError(courtsResult.error)
      throwIfError(identityResult.error)
      throwIfError(linkRequestResult.error)

      const session = sessionResult.data
      const courts = courtsResult.data ?? []
      const ownPlayerId = identityResult.data?.player_id ?? null
      const latestRequest = linkRequestResult.data?.[0]
        ? {
            id: linkRequestResult.data[0].id,
            targetPlayerId: linkRequestResult.data[0].target_player_id,
            status: linkRequestResult.data[0].status as ProfileLinkRequest['status'],
            createdAt: linkRequestResult.data[0].created_at,
            reviewedAt: linkRequestResult.data[0].reviewed_at,
          }
        : null
      const profileResult = ownPlayerId
        ? await client
            .from('players')
            .select('*')
            .eq('id', ownPlayerId)
            .maybeSingle()
        : { data: null, error: null }
      throwIfError(profileResult.error)
      const profile = profileResult.data
        ? {
            id: profileResult.data.id,
            displayName: profileResult.data.display_name,
            skillLevel: profileResult.data.skill_level,
          }
        : null
      if (!session) {
        return {
          session: null,
          profile,
          member: null,
          queuePosition: null,
          queue: [],
          courts: courts
            .map((court): Court | null => {
              const number = toCourtNumber(court.number)
              return number
                ? { number, name: court.name, status: court.status }
                : null
            })
            .filter((court) => court !== null),
          profileLinkRequest: latestRequest,
        }
      }

      const [players, sessionPlayers, queue, matches, matchPlayers] =
        await Promise.all([
          client.from('players').select('*'),
          client.from('session_players').select('*').eq('session_id', session.id),
          client
            .from('queue_entries')
            .select('*')
            .eq('session_id', session.id)
            .in('status', [...activeQueueStatuses]),
          client
            .from('matches')
            .select('*')
            .eq('session_id', session.id)
            .in('status', [...activeMatchStatuses]),
          client
            .from('match_players')
            .select('*')
            .eq('session_id', session.id)
            .is('released_at', null),
        ])

      for (const result of [players, sessionPlayers, queue, matches, matchPlayers]) {
        throwIfError(result.error)
      }

      return buildSnapshot(
        session,
        courts,
        players.data ?? [],
        sessionPlayers.data ?? [],
        queue.data ?? [],
        matches.data ?? [],
        matchPlayers.data ?? [],
        ownPlayerId,
        profile,
        latestRequest,
      )
    },

    async joinQueue(displayName, skillLevel) {
      const { error } = await client.rpc('join_current_queue', {
        p_display_name: displayName,
        p_skill_level: skillLevel,
      })
      throwIfError(error)
    },

    async leaveQueue() {
      const { error } = await client.rpc('leave_current_queue')
      throwIfError(error)
    },

    async searchProfiles(query) {
      const { data, error } = await client.rpc('search_member_profiles', {
        p_query: query.trim(),
      })
      throwIfError(error)
      return (data ?? []).map((profile) => ({
        id: profile.player_id,
        displayName: profile.display_name,
        skillLevel: profile.skill_level,
        lastJoinedAt: profile.last_joined_at,
      }))
    },

    async requestProfileLink(playerId) {
      const { error } = await client.rpc('request_profile_link', {
        p_player_id: playerId,
      })
      throwIfError(error)
    },

    async getProfileLinkRequest() {
      const { data, error } = await client.rpc('get_my_profile_link_request')
      throwIfError(error)
      const request = data?.[0]
      return request
        ? {
            id: request.id,
            targetPlayerId: request.target_player_id,
            status: request.status as ProfileLinkRequest['status'],
            createdAt: request.created_at,
            reviewedAt: request.reviewed_at,
          }
        : null
    },

    subscribe(sessionId, onChange, onStatus) {
      let refreshTimer: ReturnType<typeof setTimeout> | null = null
      let channel: RealtimeChannel = client.channel(
        `member:${sessionId ?? 'no-session'}:live-state`,
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
