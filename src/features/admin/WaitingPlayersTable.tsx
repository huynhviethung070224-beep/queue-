import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { QueuePlayer } from '../../types/domain'

interface WaitingPlayersTableProps {
  players: QueuePlayer[]
  selectedIds: Set<string>
  onToggle: (playerId: string) => void
  onEdit: (player: QueuePlayer) => void
  onRemove: (player: QueuePlayer) => void
}

export function WaitingPlayersTable({
  players,
  selectedIds,
  onToggle,
  onEdit,
  onRemove,
}: WaitingPlayersTableProps) {
  return (
    <section className="card overflow-hidden" aria-labelledby="waiting-players-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <p className="eyebrow">Fairness order</p>
          <h2 id="waiting-players-title" className="mt-1 text-lg font-bold text-navy-950">
            Waiting players
          </h2>
        </div>
        <span className="text-sm font-semibold text-slate-600">
          {selectedIds.size}/4 selected
        </span>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-5 py-3 sm:px-6">Select</th>
              <th scope="col" className="px-4 py-3">Player</th>
              <th scope="col" className="px-4 py-3">Level</th>
              <th scope="col" className="px-4 py-3">Wait</th>
              <th scope="col" className="px-4 py-3">Games</th>
              <th scope="col" className="px-5 py-3 text-right sm:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {players.map((player, index) => {
              const selected = selectedIds.has(player.id)
              const disabled = selectedIds.size === 4 && !selected
              return (
                <tr key={player.id} className={selected ? 'bg-emerald-50/60' : 'bg-white'}>
                  <td className="px-5 py-4 sm:px-6">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => onToggle(player.id)}
                      aria-label={`Select ${player.displayName}`}
                      className="size-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 disabled:opacity-40"
                    />
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-900">
                    <span className="mr-2 text-xs text-slate-400">#{index + 1}</span>
                    {player.displayName}
                  </td>
                  <td className="px-4 py-4"><StatusBadge kind="skill" value={player.skillLevel} /></td>
                  <td className="px-4 py-4 text-slate-600">{player.waitMinutes} min</td>
                  <td className="px-4 py-4 text-slate-600">{player.gamesPlayed}</td>
                  <td className="px-5 py-4 sm:px-6">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" className="min-h-10 px-3" onClick={() => onEdit(player)} aria-label={`Edit ${player.displayName}`}>
                        <Pencil aria-hidden="true" size={16} />
                      </Button>
                      <Button variant="ghost" className="min-h-10 px-3 text-red-700" onClick={() => onRemove(player)} aria-label={`Remove ${player.displayName}`}>
                        <Trash2 aria-hidden="true" size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {players.map((player, index) => {
          const selected = selectedIds.has(player.id)
          const disabled = selectedIds.size === 4 && !selected
          return (
            <li key={player.id} className={`p-4 ${selected ? 'bg-emerald-50/60' : 'bg-white'}`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={disabled}
                  onChange={() => onToggle(player.id)}
                  aria-label={`Select ${player.displayName}`}
                  className="mt-1 size-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">#{index + 1} {player.displayName}</span>
                    <StatusBadge kind="skill" value={player.skillLevel} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Waiting {player.waitMinutes} min · {player.gamesPlayed} games
                  </p>
                </div>
                <div className="flex">
                  <Button variant="ghost" className="min-h-10 px-2" onClick={() => onEdit(player)} aria-label={`Edit ${player.displayName}`}>
                    <Pencil aria-hidden="true" size={16} />
                  </Button>
                  <Button variant="ghost" className="min-h-10 px-2 text-red-700" onClick={() => onRemove(player)} aria-label={`Remove ${player.displayName}`}>
                    <Trash2 aria-hidden="true" size={16} />
                  </Button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
