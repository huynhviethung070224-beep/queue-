import { Clock3, Users } from 'lucide-react'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { QueuePlayer } from '../../types/domain'

interface LiveQueueListProps {
  players: QueuePlayer[]
}

export function LiveQueueList({ players }: LiveQueueListProps) {
  return (
    <section className="card overflow-hidden" aria-labelledby="live-queue-title">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <p className="eyebrow">Fairness order</p>
          <h2 id="live-queue-title" className="mt-1 text-lg font-bold text-navy-950">
            Live queue
          </h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          <Users aria-hidden="true" size={14} /> {players.length} waiting
        </span>
      </div>

      {players.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">
          The queue is empty. You can be first tonight.
        </div>
      ) : (
        <ol className="divide-y divide-slate-100">
          {players.map((player, index) => (
            <li key={player.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
              <span
                className="grid size-8 shrink-0 place-items-center rounded-full bg-navy-950 text-sm font-bold text-white"
                aria-label={`Queue position ${index + 1}`}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-slate-900">
                    {player.displayName}
                  </span>
                  {player.duplicateSuffix && (
                    <span className="text-xs text-slate-500">{player.duplicateSuffix}</span>
                  )}
                  <StatusBadge kind="skill" value={player.skillLevel} />
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock3 aria-hidden="true" size={13} /> Waiting {player.waitMinutes} min ·{' '}
                  {player.gamesPlayed} {player.gamesPlayed === 1 ? 'game' : 'games'}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
