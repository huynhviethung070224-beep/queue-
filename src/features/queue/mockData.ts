import type { ClubSession, Court, QueuePlayer } from '../../types/domain'

export const mockSession: ClubSession = {
  id: 'session-monday-0824',
  name: 'Monday Club Night',
  status: 'open',
  openedAt: '2026-08-24T22:00:00.000Z',
  autoRequeue: true,
}

export const mockQueuePlayers: QueuePlayer[] = [
  {
    id: 'player-alex-k',
    displayName: 'Alex K.',
    skillLevel: 'intermediate',
    gamesPlayed: 0,
    queuedAt: '2026-08-24T22:42:00.000Z',
    waitMinutes: 18,
    status: 'waiting',
  },
  {
    id: 'player-priya-s',
    displayName: 'Priya S.',
    skillLevel: 'intermediate',
    gamesPlayed: 0,
    queuedAt: '2026-08-24T22:47:00.000Z',
    waitMinutes: 13,
    status: 'waiting',
  },
  {
    id: 'player-jordan-l',
    displayName: 'Jordan L.',
    skillLevel: 'intermediate',
    gamesPlayed: 1,
    queuedAt: '2026-08-24T22:50:00.000Z',
    waitMinutes: 10,
    status: 'waiting',
  },
  {
    id: 'player-maya-r',
    displayName: 'Maya R.',
    skillLevel: 'beginner',
    gamesPlayed: 1,
    queuedAt: '2026-08-24T22:52:00.000Z',
    waitMinutes: 8,
    status: 'waiting',
  },
  {
    id: 'player-sam-t',
    displayName: 'Sam T.',
    duplicateSuffix: '#12',
    skillLevel: 'advanced',
    gamesPlayed: 2,
    queuedAt: '2026-08-24T22:55:00.000Z',
    waitMinutes: 5,
    status: 'waiting',
  },
]

export const mockCourts: Court[] = [
  {
    number: 1,
    name: 'Court 1',
    status: 'playing',
    matchStartedAt: '2026-08-24T22:41:00.000Z',
    playerNames: ['Nina', 'Owen', 'Luis', 'Chloe'],
  },
  {
    number: 2,
    name: 'Court 2',
    status: 'called',
    playerNames: ['Evan', 'Zoe', 'Noah', 'Ava'],
  },
  {
    number: 3,
    name: 'Court 3',
    status: 'available',
  },
]

export const mockRecommendedPlayerIds = [
  'player-alex-k',
  'player-priya-s',
  'player-jordan-l',
  'player-maya-r',
]
