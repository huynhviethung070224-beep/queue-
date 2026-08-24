export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

export type QueueStatus = 'waiting' | 'called' | 'playing'

export type CourtStatus = 'disabled' | 'available' | 'called' | 'playing'

export interface QueuePlayer {
  id: string
  displayName: string
  duplicateSuffix?: string
  skillLevel: SkillLevel
  gamesPlayed: number
  queuedAt: string
  waitMinutes: number
  status: QueueStatus
  courtNumber?: 1 | 2 | 3
}

export interface Court {
  number: 1 | 2 | 3
  name: string
  status: CourtStatus
  matchStartedAt?: string
  playerNames?: string[]
}

export interface ClubSession {
  id: string
  name: string
  status: 'open' | 'closed'
  openedAt: string
  autoRequeue: boolean
}
