import { describe, expect, it } from 'vitest'
import type { QueuePlayer, SkillLevel } from '../../types/domain'
import {
  recommendGroupsForCourts,
  recommendNextGroup,
  sortByFairness,
} from './fairness'

const baseTime = Date.parse('2026-08-25T00:00:00.000Z')

function player(
  id: string,
  overrides: Partial<QueuePlayer> = {},
): QueuePlayer {
  return {
    id,
    displayName: `Player ${id}`,
    skillLevel: 'intermediate',
    gamesPlayed: 0,
    lastMatchEndedAt: null,
    queuedAt: new Date(baseTime + Number(id.replace(/\D/g, '') || 0) * 60_000).toISOString(),
    waitMinutes: 20,
    status: 'waiting',
    ...overrides,
  }
}

function ids(players: readonly QueuePlayer[]) {
  return players.map(({ id }) => id)
}

describe('fairness ordering', () => {
  it('ranks zero games before one game', () => {
    const result = sortByFairness([
      player('one', { gamesPlayed: 1 }),
      player('zero', { gamesPlayed: 0 }),
    ])
    expect(ids(result)).toEqual(['zero', 'one'])
  })

  it('lets fewer games outrank a much earlier queue entry', () => {
    const result = sortByFairness([
      player('older', {
        gamesPlayed: 2,
        queuedAt: '2026-08-24T20:00:00.000Z',
      }),
      player('newer', {
        gamesPlayed: 1,
        queuedAt: '2026-08-24T23:59:00.000Z',
      }),
    ])
    expect(ids(result)).toEqual(['newer', 'older'])
  })

  it('ranks never-played players first within an equal game-count group', () => {
    const result = sortByFairness([
      player('played', {
        gamesPlayed: 1,
        lastMatchEndedAt: '2026-08-24T21:00:00.000Z',
      }),
      player('never', { gamesPlayed: 1, lastMatchEndedAt: null }),
    ])
    expect(ids(result)).toEqual(['never', 'played'])
  })

  it('uses earlier previous-match end time when game counts are equal', () => {
    const result = sortByFairness([
      player('later-rest', {
        gamesPlayed: 1,
        lastMatchEndedAt: '2026-08-24T23:00:00.000Z',
      }),
      player('earlier-rest', {
        gamesPlayed: 1,
        lastMatchEndedAt: '2026-08-24T22:00:00.000Z',
      }),
    ])
    expect(ids(result)).toEqual(['earlier-rest', 'later-rest'])
  })

  it('uses FIFO queue time after equal game and rest statistics', () => {
    const result = sortByFairness([
      player('later', { queuedAt: '2026-08-24T23:10:00.000Z' }),
      player('earlier', { queuedAt: '2026-08-24T23:00:00.000Z' }),
    ])
    expect(ids(result)).toEqual(['earlier', 'later'])
  })

  it('uses stable ID as the final deterministic tie-breaker', () => {
    const queuedAt = '2026-08-24T23:00:00.000Z'
    const result = sortByFairness([
      player('player-b', { queuedAt }),
      player('player-a', { queuedAt }),
    ])
    expect(ids(result)).toEqual(['player-a', 'player-b'])
  })

  it('does not mutate the input array', () => {
    const input = [player('2'), player('1')]
    const original = [...input]
    sortByFairness(input)
    expect(input).toEqual(original)
  })
})

describe('skill-compatible recommendations', () => {
  it('prefers a same-level group while keeping the highest-priority player', () => {
    const players = [
      player('1', { skillLevel: 'beginner' }),
      player('2', { skillLevel: 'intermediate', waitMinutes: 20 }),
      player('3', { skillLevel: 'intermediate', waitMinutes: 20 }),
      player('4', { skillLevel: 'intermediate', waitMinutes: 20 }),
      player('5', { skillLevel: 'beginner' }),
      player('6', { skillLevel: 'beginner' }),
      player('7', { skillLevel: 'beginner' }),
    ]

    const recommendation = recommendNextGroup(players)
    expect(recommendation?.mode).toBe('same-level')
    expect(ids(recommendation?.players ?? [])).toEqual(['1', '5', '6', '7'])
  })

  it('allows an adjacent-level anchor after the wait threshold', () => {
    const recommendation = recommendNextGroup([
      player('1', { skillLevel: 'beginner', waitMinutes: 15 }),
      player('2', { skillLevel: 'intermediate', waitMinutes: 2 }),
      player('3', { skillLevel: 'intermediate', waitMinutes: 3 }),
      player('4', { skillLevel: 'intermediate', waitMinutes: 4 }),
    ])
    expect(recommendation?.mode).toBe('adjacent-level')
    expect(ids(recommendation?.players ?? [])).toEqual(['1', '2', '3', '4'])
  })

  it('allows an adjacent-level minority player who reached the threshold', () => {
    const recommendation = recommendNextGroup([
      player('1', { skillLevel: 'beginner', waitMinutes: 2 }),
      player('2', { skillLevel: 'beginner', waitMinutes: 3 }),
      player('3', { skillLevel: 'beginner', waitMinutes: 4 }),
      player('4', { skillLevel: 'intermediate', waitMinutes: 15 }),
    ])
    expect(recommendation?.mode).toBe('adjacent-level')
  })

  it('does not allow adjacent levels before anyone crossing levels reaches the threshold', () => {
    const recommendation = recommendNextGroup([
      player('1', { skillLevel: 'beginner', waitMinutes: 14 }),
      player('2', { skillLevel: 'beginner', waitMinutes: 14 }),
      player('3', { skillLevel: 'intermediate', waitMinutes: 14 }),
      player('4', { skillLevel: 'intermediate', waitMinutes: 14 }),
    ])
    expect(recommendation).toBeNull()
  })

  it('supports both legal adjacent pairs', () => {
    const group = (left: SkillLevel, right: SkillLevel) =>
      recommendNextGroup([
        player('1', { skillLevel: left, waitMinutes: 15 }),
        player('2', { skillLevel: right }),
        player('3', { skillLevel: right }),
        player('4', { skillLevel: right }),
      ])

    expect(group('beginner', 'intermediate')).not.toBeNull()
    expect(group('advanced', 'intermediate')).not.toBeNull()
  })

  it('never automatically mixes beginner and advanced players', () => {
    const recommendation = recommendNextGroup([
      player('1', { skillLevel: 'beginner', waitMinutes: 60 }),
      player('2', { skillLevel: 'advanced', waitMinutes: 60 }),
      player('3', { skillLevel: 'advanced', waitMinutes: 60 }),
      player('4', { skillLevel: 'advanced', waitMinutes: 60 }),
    ])
    expect(recommendation).toBeNull()
  })

  it('never permits all three skill levels in one automatic match', () => {
    const recommendation = recommendNextGroup([
      player('1', { skillLevel: 'intermediate', waitMinutes: 60 }),
      player('2', { skillLevel: 'beginner', waitMinutes: 60 }),
      player('3', { skillLevel: 'advanced', waitMinutes: 60 }),
      player('4', { skillLevel: 'intermediate', waitMinutes: 60 }),
    ])
    expect(recommendation).toBeNull()
  })

  it('returns no recommendation with fewer than four compatible waiting players', () => {
    expect(recommendNextGroup([player('1'), player('2'), player('3')])).toBeNull()
    expect(
      recommendNextGroup([
        player('1'),
        player('2'),
        player('3'),
        player('4', { status: 'called' }),
      ]),
    ).toBeNull()
  })

  it('never includes the same player ID twice', () => {
    const recommendation = recommendNextGroup([
      player('1'),
      player('1'),
      player('2'),
      player('3'),
      player('4'),
    ])
    const selectedIds = ids(recommendation?.players ?? [])
    expect(new Set(selectedIds).size).toBe(selectedIds.length)
  })

  it('does not bypass an incompatible highest-priority player for a later group', () => {
    const recommendation = recommendNextGroup([
      player('1', { skillLevel: 'beginner', waitMinutes: 5 }),
      player('2', { skillLevel: 'advanced' }),
      player('3', { skillLevel: 'advanced' }),
      player('4', { skillLevel: 'advanced' }),
      player('5', { skillLevel: 'advanced' }),
    ])
    expect(recommendation).toBeNull()
  })

  it('supports a configurable adjacent-level wait threshold', () => {
    const players = [
      player('1', { skillLevel: 'beginner', waitMinutes: 10 }),
      player('2', { skillLevel: 'intermediate', waitMinutes: 0 }),
      player('3', { skillLevel: 'intermediate', waitMinutes: 0 }),
      player('4', { skillLevel: 'intermediate', waitMinutes: 0 }),
    ]
    expect(recommendNextGroup(players, 15)).toBeNull()
    expect(recommendNextGroup(players, 10)).not.toBeNull()
  })

  it('creates up to three court groups without sharing players', () => {
    const players = Array.from({ length: 12 }, (_, index) => player(String(index + 1)))
    const groups = recommendGroupsForCourts(players, 3)
    const selectedIds = groups.flatMap((group) => ids(group.players))

    expect(groups).toHaveLength(3)
    expect(selectedIds).toHaveLength(12)
    expect(new Set(selectedIds).size).toBe(12)
  })
})
