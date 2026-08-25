import {
  AlertCircle,
  CalendarClock,
  CloudOff,
  LoaderCircle,
  LogOut,
  Radio,
  RefreshCw,
  Settings2,
  Users,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { AdminCourtCard } from '../features/admin/AdminCourtCard'
import type { AdminCourt } from '../features/admin/adminService'
import { EditPlayerDialog } from '../features/admin/EditPlayerDialog'
import { RecommendationPanel } from '../features/admin/RecommendationPanel'
import { useAdminDashboard } from '../features/admin/useAdminDashboard'
import { WaitingPlayersTable } from '../features/admin/WaitingPlayersTable'
import { useAdminAuth } from '../features/auth/useAdminAuth'
import { recommendNextGroup } from '../features/queue/fairness'
import type { QueuePlayer } from '../types/domain'

interface ConfirmationState {
  title: string
  description: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => Promise<void>
}

function DashboardLoading() {
  return (
    <div className="card grid min-h-64 place-items-center p-8 text-center" role="status">
      <div>
        <LoaderCircle aria-hidden="true" className="mx-auto animate-spin text-emerald-600" size={30} />
        <h1 className="mt-4 text-xl font-bold text-navy-950">Loading control desk</h1>
        <p className="mt-2 text-sm text-slate-600">Reading the current session, queue, matches, and courts.</p>
      </div>
    </div>
  )
}

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const auth = useAdminAuth()
  const dashboard = useAdminDashboard(auth.service, auth.status === 'authorized')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedCourt, setSelectedCourt] = useState('1')
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null)
  const [editingPlayer, setEditingPlayer] = useState<QueuePlayer | null>(null)
  const [newSessionName, setNewSessionName] = useState('')
  const [newSessionAutoRequeue, setNewSessionAutoRequeue] = useState(true)
  const [requeueOverride, setRequeueOverride] = useState<boolean | null>(null)
  const [pageError, setPageError] = useState('')

  const snapshot = dashboard.snapshot
  const activeSession = snapshot?.activeSession ?? null
  const players = snapshot?.waitingPlayers ?? []
  const courts = snapshot?.courts ?? []
  const recommendation = useMemo(
    () => recommendNextGroup(snapshot?.waitingPlayers ?? []),
    [snapshot?.waitingPlayers],
  )
  const recommendedPlayers = recommendation?.players ?? []
  const actionDisabled =
    Boolean(dashboard.pendingAction) || dashboard.connection !== 'connected'
  const requeuePlayers = requeueOverride ?? activeSession?.autoRequeue ?? true

  if (dashboard.loading && !snapshot) return <DashboardLoading />

  if (!snapshot) {
    return (
      <section className="card mx-auto max-w-2xl p-6 sm:p-8" aria-labelledby="admin-load-error-title">
        <AlertCircle aria-hidden="true" className="text-red-600" size={28} />
        <h1 id="admin-load-error-title" className="mt-3 text-2xl font-bold text-navy-950">
          We could not load the admin dashboard
        </h1>
        <p role="alert" className="mt-2 text-sm text-red-700">
          {dashboard.error ?? 'The admin service is temporarily unavailable.'}
        </p>
        <Button onClick={() => void dashboard.retry()} className="mt-5">
          <RefreshCw aria-hidden="true" size={16} /> Retry
        </Button>
      </section>
    )
  }

  function togglePlayer(playerId: string) {
    if (actionDisabled) return
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(playerId)) next.delete(playerId)
      else if (next.size < 4) next.add(playerId)
      return next
    })
  }

  function selectRecommendation() {
    setSelectedIds(new Set(recommendedPlayers.map((player) => player.id)))
  }

  async function assignPlayers() {
    const courtNumber = Number(selectedCourt)
    const court = courts.find((item) => item.number === courtNumber)
    if (selectedIds.size !== 4 || !court || court.status !== 'available') {
      setPageError('Select exactly four waiting players and an available court.')
      return
    }
    setPageError('')
    if (await dashboard.assignPlayers(courtNumber, [...selectedIds])) {
      setSelectedIds(new Set())
    }
  }

  function handleCourtAction(
    court: AdminCourt,
    action: 'start' | 'cancel' | 'end' | 'toggle',
  ) {
    setPageError('')
    if (action === 'toggle') {
      void dashboard.setCourtEnabled(court.number, court.status === 'disabled')
      return
    }
    if (!court.activeMatchId) {
      setPageError(`${court.name} does not have an active match record.`)
      return
    }
    if (action === 'start') {
      void dashboard.startMatch(court.activeMatchId, court.name)
      return
    }

    const matchId = court.activeMatchId
    setConfirmation({
      title: action === 'end' ? `End match on ${court.name}?` : `Cancel call on ${court.name}?`,
      description:
        action === 'end'
          ? `This completes all four queue entries and ${requeuePlayers ? 'returns the players to the queue' : 'marks the players inactive'}.`
          : 'The four players return to waiting with their original queue times.',
      confirmLabel: action === 'end' ? 'End match' : 'Cancel call',
      danger: action === 'cancel',
      onConfirm: async () => {
        const success =
          action === 'end'
            ? await dashboard.endMatch(matchId, court.name, requeuePlayers)
            : await dashboard.cancelMatch(matchId, court.name)
        if (success) setConfirmation(null)
      },
    })
  }

  function requestPlayerRemoval(player: QueuePlayer) {
    if (!activeSession) return
    setConfirmation({
      title: `Remove ${player.displayName}?`,
      description: 'This removes only the current waiting entry. Called or playing players must be handled through their match first.',
      confirmLabel: 'Remove player',
      danger: true,
      onConfirm: async () => {
        const success = await dashboard.removePlayer(
          activeSession.id,
          player.id,
          player.displayName,
        )
        if (success) {
          setSelectedIds((current) => {
            const next = new Set(current)
            next.delete(player.id)
            return next
          })
          setConfirmation(null)
        }
      },
    })
  }

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newSessionName.trim()
    if (name.length < 2 || name.length > 80) {
      setPageError('Session name must contain between 2 and 80 characters.')
      return
    }
    setPageError('')
    if (await dashboard.createSession(name, newSessionAutoRequeue)) setNewSessionName('')
  }

  async function logout() {
    await auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="space-y-8">
      {(dashboard.connection === 'offline' || dashboard.connection === 'reconnecting' || dashboard.connection === 'error') && (
        <div role="status" className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${dashboard.connection === 'offline' ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-sky-200 bg-sky-50 text-sky-950'}`}>
          {dashboard.connection === 'offline' ? <CloudOff aria-hidden="true" className="mt-0.5 shrink-0" size={18} /> : <RefreshCw aria-hidden="true" className="mt-0.5 shrink-0" size={18} />}
          <span>
            {dashboard.connection === 'offline'
              ? 'Offline: showing the last known state. All admin mutations are disabled.'
              : dashboard.connection === 'error'
                ? 'Live updates were interrupted. Reload authoritative state before acting.'
                : 'Realtime is reconnecting and authoritative state is being refreshed…'}
          </span>
        </div>
      )}

      {(dashboard.error || pageError) && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {pageError || dashboard.error}
        </div>
      )}

      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <Radio aria-hidden="true" size={15} /> Database-authorized admin · {auth.email}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
            Club night control desk
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {activeSession ? activeSession.name : 'No club session is currently open'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeSession && (
            <Button
              variant="danger"
              disabled={actionDisabled}
              onClick={() =>
                setConfirmation({
                  title: 'Close the current club session?',
                  description: 'Waiting entries will close. Called or playing matches must be completed or cancelled first.',
                  confirmLabel: 'Close session',
                  danger: true,
                  onConfirm: async () => {
                    if (await dashboard.closeSession(activeSession.id)) setConfirmation(null)
                  },
                })
              }
            >
              Close session
            </Button>
          )}
          <Button disabled={auth.pending} variant="ghost" onClick={() => void logout()}>
            <LogOut aria-hidden="true" size={16} /> Sign out
          </Button>
        </div>
      </section>

      <div role="status" className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <Settings2 aria-hidden="true" size={17} /> {dashboard.notice}
      </div>

      {!activeSession && (
        <section className="grid gap-6 lg:grid-cols-2" aria-label="Session setup">
          <form className="card p-5 sm:p-6" onSubmit={createSession}>
            <p className="eyebrow">New club night</p>
            <h2 className="mt-1 text-lg font-bold text-navy-950">Create a draft session</h2>
            <label htmlFor="new-session-name" className="form-label mt-5">Session name</label>
            <input id="new-session-name" className="form-control" placeholder="Monday Club Night" minLength={2} maxLength={80} value={newSessionName} onChange={(event) => setNewSessionName(event.target.value)} />
            <label className="mt-4 flex items-center gap-3 text-sm text-slate-700">
              <input type="checkbox" checked={newSessionAutoRequeue} onChange={(event) => setNewSessionAutoRequeue(event.target.checked)} className="size-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600" />
              Requeue players by default after completed matches
            </label>
            <Button type="submit" disabled={actionDisabled} className="mt-5 w-full">Create draft</Button>
          </form>

          <section className="card p-5 sm:p-6" aria-labelledby="draft-sessions-title">
            <p className="eyebrow">Ready to open</p>
            <h2 id="draft-sessions-title" className="mt-1 text-lg font-bold text-navy-950">Draft sessions</h2>
            {snapshot.draftSessions.length ? (
              <ul className="mt-4 space-y-3">
                {snapshot.draftSessions.map((session) => (
                  <li key={session.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{session.name}</p>
                      <p className="mt-1 text-xs text-slate-500">Auto-requeue {session.autoRequeue ? 'on' : 'off'}</p>
                    </div>
                    <Button disabled={actionDisabled} onClick={() => void dashboard.openSession(session.id, session.name)}>Open session</Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Create a draft before opening club night.</p>
            )}
          </section>
        </section>
      )}

      {activeSession && (
        <>
          <section className="grid gap-4 sm:grid-cols-3" aria-label="Session summary">
            <div className="card p-5"><CalendarClock aria-hidden="true" className="text-emerald-600" size={20} /><p className="mt-3 text-xs text-slate-500">Session</p><p className="mt-1 font-bold text-navy-950">Open</p></div>
            <div className="card p-5"><Users aria-hidden="true" className="text-violet-600" size={20} /><p className="mt-3 text-xs text-slate-500">Waiting</p><p className="mt-1 font-bold text-navy-950">{players.length} players</p></div>
            <label className="card flex cursor-pointer items-center justify-between gap-4 p-5"><span><span className="block text-xs text-slate-500">When ending a match</span><span className="mt-1 block font-bold text-navy-950">Requeue those players</span></span><input type="checkbox" disabled={actionDisabled} checked={requeuePlayers} onChange={(event) => setRequeueOverride(event.target.checked)} className="size-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600" /></label>
          </section>

          <section aria-labelledby="court-management-title">
            <div className="mb-4"><p className="eyebrow">Live controls</p><h2 id="court-management-title" className="mt-1 text-xl font-bold text-navy-950">Court management</h2></div>
            <div className="grid gap-4 lg:grid-cols-3">
              {courts.map((court) => <AdminCourtCard key={court.number} court={court} disabled={actionDisabled} onAction={handleCourtAction} />)}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
            <WaitingPlayersTable players={players} selectedIds={selectedIds} onToggle={togglePlayer} onEdit={setEditingPlayer} onRemove={requestPlayerRemoval} disabled={actionDisabled} />
            <div className="space-y-4">
              <RecommendationPanel
                players={recommendedPlayers}
                explanation={recommendation?.explanation}
                mode={recommendation?.mode}
                onSelect={selectRecommendation}
                disabled={actionDisabled}
              />
              <section className="card p-5" aria-labelledby="assign-court-title">
                <h2 id="assign-court-title" className="font-bold text-navy-950">Assign selected group</h2>
                <p className="mt-1 text-sm text-slate-500">Exactly four currently waiting players are required.</p>
                <label htmlFor="court-selection" className="form-label mt-4">Available court</label>
                <select id="court-selection" disabled={actionDisabled} className="form-control" value={selectedCourt} onChange={(event) => setSelectedCourt(event.target.value)}>
                  {courts.map((court) => <option key={court.number} value={court.number} disabled={court.status !== 'available'}>{court.name} — {court.status}</option>)}
                </select>
                <Button className="mt-4 w-full" disabled={actionDisabled || selectedIds.size !== 4} onClick={() => void assignPlayers()}>Call four players</Button>
                {selectedIds.size === 4 && recommendedPlayers.some((player) => !selectedIds.has(player.id)) && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Manual override: this selection differs from the current fairness order. Confirm compatibility before calling.</p>}
              </section>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.title ?? ''}
        description={confirmation?.description ?? ''}
        confirmLabel={confirmation?.confirmLabel ?? 'Confirm'}
        danger={confirmation?.danger}
        pending={Boolean(dashboard.pendingAction)}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => void confirmation?.onConfirm()}
      />
      {editingPlayer && (
        <EditPlayerDialog
          key={editingPlayer.id}
          player={editingPlayer}
          pending={dashboard.pendingAction === `update-${editingPlayer.id}`}
          onCancel={() => setEditingPlayer(null)}
          onSave={(updatedPlayer) => {
            void dashboard
              .updatePlayer(updatedPlayer.id, updatedPlayer.displayName, updatedPlayer.skillLevel)
              .then((success) => {
                if (success) setEditingPlayer(null)
              })
          }}
        />
      )}
    </div>
  )
}
