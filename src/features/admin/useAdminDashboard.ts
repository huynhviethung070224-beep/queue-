import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SkillLevel } from '../../types/domain'
import type {
  AdminConnectionStatus,
  AdminService,
  AdminSnapshot,
} from './adminService'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The admin action failed.'
}

export function useAdminDashboard(service: AdminService | null, enabled: boolean) {
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('Loading authoritative club state…')
  const [connection, setConnection] =
    useState<AdminConnectionStatus>('reconnecting')
  const [now, setNow] = useState(0)
  const pendingRef = useRef<string | null>(null)

  function requireService() {
    if (!service) throw new Error('Supabase admin service is not configured.')
    return service
  }

  const loadSnapshot = useCallback(
    async (showLoading = false) => {
      if (!service || !enabled) return
      if (showLoading) setLoading(true)
      try {
        const nextSnapshot = await service.loadSnapshot()
        setSnapshot(nextSnapshot)
        setError(null)
        if (navigator.onLine) setConnection('connected')
      } catch (loadError) {
        setError(errorMessage(loadError))
        setConnection(navigator.onLine ? 'error' : 'offline')
      } finally {
        if (showLoading) setLoading(false)
      }
    },
    [enabled, service],
  )

  useEffect(() => {
    if (!enabled) return
    const timer = window.setTimeout(() => void loadSnapshot(true), 0)
    return () => window.clearTimeout(timer)
  }, [enabled, loadSnapshot])

  const subscriptionSessionId = snapshot
    ? (snapshot.activeSession?.id ?? null)
    : undefined

  useEffect(() => {
    if (!service || !enabled || subscriptionSessionId === undefined) return
    return service.subscribe(
      subscriptionSessionId,
      () => void loadSnapshot(),
      setConnection,
    )
  }, [enabled, loadSnapshot, service, subscriptionSessionId])

  useEffect(() => {
    function handleOffline() {
      setConnection('offline')
    }
    function handleOnline() {
      setConnection('reconnecting')
      void loadSnapshot()
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [loadSnapshot])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const liveSnapshot = useMemo(() => {
    if (!snapshot || now === 0) return snapshot
    return {
      ...snapshot,
      waitingPlayers: snapshot.waitingPlayers.map((player) => ({
        ...player,
        waitMinutes: Math.max(
          0,
          Math.floor((now - new Date(player.queuedAt).getTime()) / 60_000),
        ),
      })),
    }
  }, [now, snapshot])

  const runAction = useCallback(
    async (key: string, action: () => Promise<unknown>, success: string) => {
      if (!service || !enabled || pendingRef.current || connection === 'offline') {
        return false
      }
      pendingRef.current = key
      setPendingAction(key)
      setError(null)
      try {
        await action()
        await loadSnapshot()
        setNotice(success)
        return true
      } catch (actionError) {
        setError(errorMessage(actionError))
        return false
      } finally {
        pendingRef.current = null
        setPendingAction(null)
      }
    },
    [connection, enabled, loadSnapshot, service],
  )

  return {
    snapshot: liveSnapshot,
    loading,
    pendingAction,
    error,
    notice,
    connection,
    retry: () => loadSnapshot(true),
    createSession: (name: string, autoRequeue: boolean) =>
      runAction(
        'create-session',
        () => requireService().createSession(name, autoRequeue),
        `${name} created as a draft.`,
      ),
    openSession: (sessionId: string, name: string) =>
      runAction(
        'open-session',
        () => requireService().openSession(sessionId),
        `${name} is now open.`,
      ),
    closeSession: (sessionId: string) =>
      runAction(
        'close-session',
        () => requireService().closeSession(sessionId),
        'The club session is closed.',
      ),
    assignPlayers: (courtNumber: number, playerIds: string[]) =>
      runAction(
        'assign-players',
        () => requireService().assignPlayers(courtNumber, playerIds),
        `Four players were called to Court ${courtNumber}.`,
      ),
    startMatch: (matchId: string, courtName: string) =>
      runAction(
        `start-${matchId}`,
        () => requireService().startMatch(matchId),
        `${courtName} match started.`,
      ),
    cancelMatch: (matchId: string, courtName: string) =>
      runAction(
        `cancel-${matchId}`,
        () => requireService().cancelMatch(matchId),
        `${courtName} call cancelled; players returned to their original queue order.`,
      ),
    endMatch: (matchId: string, courtName: string, requeuePlayers: boolean) =>
      runAction(
        `end-${matchId}`,
        () => requireService().endMatch(matchId, requeuePlayers),
        `${courtName} match ended${requeuePlayers ? ' and players were requeued' : ''}.`,
      ),
    removePlayer: (sessionId: string, playerId: string, displayName: string) =>
      runAction(
        `remove-${playerId}`,
        () => requireService().removePlayer(sessionId, playerId),
        `${displayName} was removed from the waiting queue.`,
      ),
    updatePlayer: (
      playerId: string,
      displayName: string,
      skillLevel: SkillLevel,
    ) =>
      runAction(
        `update-${playerId}`,
        () => requireService().updatePlayer(playerId, displayName, skillLevel),
        `${displayName} was updated.`,
      ),
    setCourtEnabled: (courtNumber: number, enabledCourt: boolean) =>
      runAction(
        `court-${courtNumber}`,
        () => requireService().setCourtEnabled(courtNumber, enabledCourt),
        `Court ${courtNumber} is now ${enabledCourt ? 'available' : 'disabled'}.`,
      ),
  }
}
