import { useCallback, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured } from '../../lib/supabase'
import type { SkillLevel } from '../../types/domain'
import {
  createSupabaseMemberService,
  type MemberConnectionStatus,
  type MemberService,
  type MemberSnapshot,
} from './memberService'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function refreshWaitTimes(snapshot: MemberSnapshot, now: number): MemberSnapshot {
  if (now === 0) return snapshot

  const updateWait = <T extends { queuedAt: string; waitMinutes: number }>(player: T) => ({
    ...player,
    waitMinutes: Math.max(
      0,
      Math.floor((now - new Date(player.queuedAt).getTime()) / 60_000),
    ),
  })

  return {
    ...snapshot,
    queue: snapshot.queue.map(updateWait),
    member: snapshot.member ? updateWait(snapshot.member) : null,
  }
}

export function useMemberQueue(providedService?: MemberService) {
  const service = useMemo(() => {
    if (providedService) return providedService
    return isSupabaseConfigured() ? createSupabaseMemberService() : null
  }, [providedService])
  const [userId, setUserId] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<MemberSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(service))
  const [isActionPending, setIsActionPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connection, setConnection] =
    useState<MemberConnectionStatus>('reconnecting')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(0)

  const loadSnapshot = useCallback(
    async (currentUserId: string, showLoading = false) => {
      if (!service) return
      if (showLoading) setIsLoading(true)
      try {
        const nextSnapshot = await service.loadSnapshot(currentUserId)
        setSnapshot(nextSnapshot)
        setError(null)
        setLastUpdatedAt(new Date())
        if (navigator.onLine) setConnection('connected')
      } catch (loadError) {
        setError(getErrorMessage(loadError))
        setConnection(navigator.onLine ? 'error' : 'offline')
      } finally {
        if (showLoading) setIsLoading(false)
      }
    },
    [service],
  )

  const initialize = useCallback(async () => {
    if (!service) return
    setIsLoading(true)
    setError(null)
    try {
      const authenticatedUserId = await service.ensureAuthenticated()
      setUserId(authenticatedUserId)
      await loadSnapshot(authenticatedUserId)
    } catch (authError) {
      setError(getErrorMessage(authError))
      setConnection(navigator.onLine ? 'error' : 'offline')
    } finally {
      setIsLoading(false)
    }
  }, [loadSnapshot, service])

  useEffect(() => {
    const timer = window.setTimeout(() => void initialize(), 0)
    return () => window.clearTimeout(timer)
  }, [initialize])

  useEffect(() => {
    if (!service || !userId) return

    return service.subscribe(
      snapshot?.session?.id ?? null,
      () => void loadSnapshot(userId),
      setConnection,
    )
  }, [loadSnapshot, service, snapshot?.session?.id, userId])

  useEffect(() => {
    function handleOffline() {
      setConnection('offline')
    }

    function handleOnline() {
      setConnection('reconnecting')
      if (userId) void loadSnapshot(userId)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [loadSnapshot, userId])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  async function joinQueue(displayName: string, skillLevel: SkillLevel) {
    if (!service || !userId || isActionPending) return
    setIsActionPending(true)
    setError(null)
    try {
      await service.joinQueue(displayName, skillLevel)
      await loadSnapshot(userId)
    } catch (joinError) {
      setError(getErrorMessage(joinError))
    } finally {
      setIsActionPending(false)
    }
  }

  async function leaveQueue() {
    if (!service || !userId || isActionPending) return
    setIsActionPending(true)
    setError(null)
    try {
      await service.leaveQueue()
      await loadSnapshot(userId)
    } catch (leaveError) {
      setError(getErrorMessage(leaveError))
    } finally {
      setIsActionPending(false)
    }
  }

  return {
    configured: Boolean(service),
    snapshot: snapshot ? refreshWaitTimes(snapshot, now) : null,
    isLoading,
    isActionPending,
    error,
    connection,
    lastUpdatedAt,
    joinQueue,
    leaveQueue,
    retry: initialize,
  }
}
