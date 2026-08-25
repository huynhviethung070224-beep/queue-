import type { QueuePlayer, SkillLevel } from '../../types/domain'

export const DEFAULT_ADJACENT_WAIT_MINUTES = 15

export interface FairnessRecord {
  id: string
  gamesPlayed: number
  lastMatchEndedAt?: string | null
  queuedAt: string
}

export interface Recommendation<T extends QueuePlayer = QueuePlayer> {
  players: T[]
  mode: 'same-level' | 'adjacent-level'
  explanation: string
}

function timestampValue(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
}

function compareTimestamp(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  const leftValue = timestampValue(left)
  const rightValue = timestampValue(right)
  if (leftValue === rightValue) return 0
  return leftValue < rightValue ? -1 : 1
}

export function compareFairnessPriority(
  left: FairnessRecord,
  right: FairnessRecord,
) {
  const gamesDifference = left.gamesPlayed - right.gamesPlayed
  if (gamesDifference !== 0) return gamesDifference

  const restDifference = compareTimestamp(
    left.lastMatchEndedAt,
    right.lastMatchEndedAt,
  )
  if (restDifference !== 0) return restDifference

  const queueDifference = compareTimestamp(left.queuedAt, right.queuedAt)
  if (queueDifference !== 0) return queueDifference

  return left.id.localeCompare(right.id)
}

export function sortByFairness<T extends FairnessRecord>(players: readonly T[]): T[] {
  return [...players].sort(compareFairnessPriority)
}

function isAdjacentPair(levels: Set<SkillLevel>) {
  if (levels.size !== 2) return false
  if (levels.has('beginner') && levels.has('advanced')) return false
  return true
}

function isAdjacentGroupEligible<T extends QueuePlayer>(
  players: readonly T[],
  waitThresholdMinutes: number,
) {
  const levels = new Set(players.map((player) => player.skillLevel))
  if (!isAdjacentPair(levels)) return false

  return [...levels].some((baseLevel) =>
    players
      .filter((player) => player.skillLevel !== baseLevel)
      .every((player) => player.waitMinutes >= waitThresholdMinutes),
  )
}

function combinationsOfThree<T>(items: readonly T[]) {
  const combinations: [T, T, T][] = []
  for (let first = 0; first < items.length - 2; first += 1) {
    for (let second = first + 1; second < items.length - 1; second += 1) {
      for (let third = second + 1; third < items.length; third += 1) {
        const firstItem = items.at(first)
        const secondItem = items.at(second)
        const thirdItem = items.at(third)
        if (firstItem !== undefined && secondItem !== undefined && thirdItem !== undefined) {
          combinations.push([firstItem, secondItem, thirdItem])
        }
      }
    }
  }
  return combinations
}

function uniqueWaitingPlayers<T extends QueuePlayer>(players: readonly T[]) {
  const unique = new Map<string, T>()
  for (const player of players) {
    if (player.status === 'waiting' && !unique.has(player.id)) {
      unique.set(player.id, player)
    }
  }
  return sortByFairness([...unique.values()])
}

export function recommendNextGroup<T extends QueuePlayer>(
  players: readonly T[],
  waitThresholdMinutes = DEFAULT_ADJACENT_WAIT_MINUTES,
): Recommendation<T> | null {
  const ordered = uniqueWaitingPlayers(players)
  if (ordered.length < 4) return null

  const [highestPriorityPlayer, ...remainingPlayers] = ordered
  if (!highestPriorityPlayer || remainingPlayers.length < 3) return null
  let adjacentGroup: T[] | null = null

  for (const combination of combinationsOfThree(remainingPlayers)) {
    const group = [highestPriorityPlayer, ...combination]
    const levels = new Set(group.map((player) => player.skillLevel))

    if (levels.size === 1) {
      return {
        players: group,
        mode: 'same-level',
        explanation: `${highestPriorityPlayer.displayName} has the highest fairness priority, and all four players share the ${highestPriorityPlayer.skillLevel} level.`,
      }
    }

    if (!adjacentGroup && isAdjacentGroupEligible(group, waitThresholdMinutes)) {
      adjacentGroup = group
    }
  }

  if (!adjacentGroup) return null
  return {
    players: adjacentGroup,
    mode: 'adjacent-level',
    explanation: `${highestPriorityPlayer.displayName} has the highest fairness priority. Adjacent levels are allowed because the players crossing levels have waited at least ${waitThresholdMinutes} minutes.`,
  }
}

export function recommendGroupsForCourts<T extends QueuePlayer>(
  players: readonly T[],
  courtCount = 3,
  waitThresholdMinutes = DEFAULT_ADJACENT_WAIT_MINUTES,
) {
  const remaining = [...players]
  const recommendations: Recommendation<T>[] = []

  for (let court = 0; court < courtCount; court += 1) {
    const recommendation = recommendNextGroup(remaining, waitThresholdMinutes)
    if (!recommendation) break
    recommendations.push(recommendation)
    const selectedIds = new Set(recommendation.players.map((player) => player.id))
    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      const player = remaining.at(index)
      if (player && selectedIds.has(player.id)) remaining.splice(index, 1)
    }
  }

  return recommendations
}
