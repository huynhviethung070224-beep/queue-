import { CheckCircle2, Sparkles } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { QueuePlayer } from '../../types/domain'

interface RecommendationPanelProps {
  players: QueuePlayer[]
  explanation?: string
  mode?: 'same-level' | 'adjacent-level'
  onSelect: () => void
  disabled?: boolean
}

export function RecommendationPanel({
  players,
  explanation,
  mode,
  onSelect,
  disabled = false,
}: RecommendationPanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/50">
      <div className="border-b border-emerald-200 bg-emerald-100/70 px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
          <Sparkles aria-hidden="true" size={17} /> Recommended next group
        </div>
      </div>
      <div className="p-5">
        {players.length === 4 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-3"
            >
              <span className="min-w-0 truncate text-sm font-semibold text-slate-900">
                {player.displayName}
              </span>
              <StatusBadge kind="skill" value={player.skillLevel} />
            </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-white p-4 text-sm text-slate-600">
            No compatible automatic group currently includes the highest-priority
            player. An admin may still select four manually with a warning.
          </p>
        )}
        <div className="mt-4 flex gap-2 rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" size={16} />
          <p>
            {explanation ??
              'The queue needs four compatible waiting players before an automatic recommendation is available.'}
          </p>
        </div>
        {mode && (
          <p className="mt-3 text-xs font-semibold capitalize text-emerald-800">
            Compatibility: {mode.replace('-', ' ')}
          </p>
        )}
        <Button disabled={disabled || players.length !== 4} onClick={onSelect} className="mt-4 w-full sm:w-auto">
          Select recommended four
        </Button>
      </div>
    </section>
  )
}
