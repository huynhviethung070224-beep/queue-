import { CalendarClock, LogOut, Radio, Settings2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { AdminCourtCard } from '../features/admin/AdminCourtCard'
import { EditPlayerDialog } from '../features/admin/EditPlayerDialog'
import { RecommendationPanel } from '../features/admin/RecommendationPanel'
import { WaitingPlayersTable } from '../features/admin/WaitingPlayersTable'
import { endMockAdminSession } from '../features/auth/mockAdminAuth'
import {
  mockCourts,
  mockQueuePlayers,
  mockRecommendedPlayerIds,
  mockSession,
} from '../features/queue/mockData'
import type { Court, QueuePlayer } from '../types/domain'

interface ConfirmationState {
  title: string
  description: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
}

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [sessionOpen, setSessionOpen] = useState(mockSession.status === 'open')
  const [autoRequeue, setAutoRequeue] = useState(mockSession.autoRequeue)
  const [players, setPlayers] = useState(mockQueuePlayers)
  const [courts, setCourts] = useState(mockCourts)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedCourt, setSelectedCourt] = useState('3')
  const [notice, setNotice] = useState('Dashboard synced with mock club state.')
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null)
  const [editingPlayer, setEditingPlayer] = useState<QueuePlayer | null>(null)

  const recommendedPlayers = useMemo(
    () =>
      mockRecommendedPlayerIds
        .map((id) => players.find((player) => player.id === id))
        .filter((player): player is QueuePlayer => Boolean(player)),
    [players],
  )

  function togglePlayer(playerId: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(playerId)) next.delete(playerId)
      else if (next.size < 4) next.add(playerId)
      return next
    })
  }

  function selectRecommendation() {
    setSelectedIds(new Set(recommendedPlayers.map((player) => player.id)))
    setNotice('Recommended group selected. Choose an available court to call them.')
  }

  function assignPlayers() {
    if (selectedIds.size !== 4) return
    const courtNumber = Number(selectedCourt) as 1 | 2 | 3
    const court = courts.find((item) => item.number === courtNumber)
    if (!court || court.status !== 'available') {
      setNotice('Choose an available court before assigning players.')
      return
    }
    const names = players.filter((player) => selectedIds.has(player.id)).map((player) => player.displayName)
    setCourts((current) =>
      current.map((item) =>
        item.number === courtNumber
          ? { ...item, status: 'called' as const, playerNames: names }
          : item,
      ),
    )
    setSelectedIds(new Set())
    setNotice(`Four players called to Court ${courtNumber}.`)
  }

  function handleCourtAction(court: Court, action: 'start' | 'cancel' | 'end' | 'toggle') {
    const nextStatus =
      action === 'start'
        ? 'playing'
        : action === 'toggle'
          ? court.status === 'disabled'
            ? 'available'
            : 'disabled'
          : 'available'

    const applyAction = () => {
      setCourts((current) =>
        current.map((item) =>
          item.number === court.number
            ? {
                ...item,
                status: nextStatus,
                playerNames: nextStatus === 'available' || nextStatus === 'disabled' ? undefined : item.playerNames,
              }
            : item,
        ),
      )
      setNotice(`${court.name} is now ${nextStatus}.`)
      setConfirmation(null)
    }

    if (action === 'cancel' || action === 'end') {
      setConfirmation({
        title: action === 'end' ? `End match on ${court.name}?` : `Cancel call on ${court.name}?`,
        description:
          action === 'end'
            ? `This closes the match and ${autoRequeue ? 'returns the four players to the queue' : 'marks the four players inactive'}.`
            : 'The four players will return to waiting with their original queue times.',
        confirmLabel: action === 'end' ? 'End match' : 'Cancel call',
        danger: action === 'cancel',
        onConfirm: applyAction,
      })
      return
    }
    applyAction()
  }

  function requestPlayerRemoval(player: QueuePlayer) {
    setConfirmation({
      title: `Remove ${player.displayName}?`,
      description: 'This removes the player from the current waiting queue. This action should only be used for no-shows or invalid entries.',
      confirmLabel: 'Remove player',
      danger: true,
      onConfirm: () => {
        setPlayers((current) => current.filter((item) => item.id !== player.id))
        setSelectedIds((current) => {
          const next = new Set(current)
          next.delete(player.id)
          return next
        })
        setNotice(`${player.displayName} removed from the mock queue.`)
        setConfirmation(null)
      },
    })
  }

  function logout() {
    endMockAdminSession()
    navigate('/admin/login')
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <Radio aria-hidden="true" size={15} /> Admin preview connected
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
            Club night control desk
          </h1>
          <p className="mt-2 text-sm text-slate-600">{mockSession.name} · Monday, August 24</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setSessionOpen(true)} disabled={sessionOpen}>Open session</Button>
          <Button
            variant="danger"
            disabled={!sessionOpen}
            onClick={() =>
              setConfirmation({
                title: 'Close the current club session?',
                description: 'New players will not be able to join. Active matches should be completed before closing.',
                confirmLabel: 'Close session',
                danger: true,
                onConfirm: () => {
                  setSessionOpen(false)
                  setNotice('Mock club session closed.')
                  setConfirmation(null)
                },
              })
            }
          >
            Close session
          </Button>
          <Button variant="ghost" onClick={logout}><LogOut aria-hidden="true" size={16} /> Sign out</Button>
        </div>
      </section>

      <div role="status" className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <Settings2 aria-hidden="true" size={17} /> {notice}
      </div>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Session summary">
        <div className="card p-5"><CalendarClock aria-hidden="true" className="text-emerald-600" size={20} /><p className="mt-3 text-xs text-slate-500">Session</p><p className="mt-1 font-bold text-navy-950">{sessionOpen ? 'Open' : 'Closed'}</p></div>
        <div className="card p-5"><Users aria-hidden="true" className="text-violet-600" size={20} /><p className="mt-3 text-xs text-slate-500">Waiting</p><p className="mt-1 font-bold text-navy-950">{players.length} players</p></div>
        <label className="card flex cursor-pointer items-center justify-between gap-4 p-5"><span><span className="block text-xs text-slate-500">After matches</span><span className="mt-1 block font-bold text-navy-950">Auto-requeue players</span></span><input type="checkbox" checked={autoRequeue} onChange={(event) => setAutoRequeue(event.target.checked)} className="size-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600" /></label>
      </section>

      <section aria-labelledby="court-management-title">
        <div className="mb-4"><p className="eyebrow">Live controls</p><h2 id="court-management-title" className="mt-1 text-xl font-bold text-navy-950">Court management</h2></div>
        <div className="grid gap-4 lg:grid-cols-3">
          {courts.map((court) => <AdminCourtCard key={court.number} court={court} onAction={handleCourtAction} />)}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <WaitingPlayersTable players={players} selectedIds={selectedIds} onToggle={togglePlayer} onEdit={setEditingPlayer} onRemove={requestPlayerRemoval} />
        <div className="space-y-4">
          <RecommendationPanel players={recommendedPlayers} onSelect={selectRecommendation} />
          <section className="card p-5" aria-labelledby="assign-court-title">
            <h2 id="assign-court-title" className="font-bold text-navy-950">Assign selected group</h2>
            <p className="mt-1 text-sm text-slate-500">Exactly four waiting players are required.</p>
            <label htmlFor="court-selection" className="form-label mt-4">Available court</label>
            <select id="court-selection" className="form-control" value={selectedCourt} onChange={(event) => setSelectedCourt(event.target.value)}>
              {courts.map((court) => <option key={court.number} value={court.number} disabled={court.status !== 'available'}>{court.name} — {court.status}</option>)}
            </select>
            <Button className="mt-4 w-full" disabled={selectedIds.size !== 4 || !sessionOpen} onClick={assignPlayers}>Call four players</Button>
            {selectedIds.size === 4 && recommendedPlayers.some((player) => !selectedIds.has(player.id)) && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Manual override: this selection differs from the fairness recommendation. Confirm compatibility before calling.</p>}
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.title ?? ''}
        description={confirmation?.description ?? ''}
        confirmLabel={confirmation?.confirmLabel ?? 'Confirm'}
        danger={confirmation?.danger}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => confirmation?.onConfirm()}
      />
      {editingPlayer && (
        <EditPlayerDialog
          key={editingPlayer.id}
          player={editingPlayer}
          onCancel={() => setEditingPlayer(null)}
          onSave={(updatedPlayer) => {
            setPlayers((current) =>
              current.map((player) =>
                player.id === updatedPlayer.id ? updatedPlayer : player,
              ),
            )
            setNotice(`${updatedPlayer.displayName} updated in the mock queue.`)
            setEditingPlayer(null)
          }}
        />
      )}
    </div>
  )
}
