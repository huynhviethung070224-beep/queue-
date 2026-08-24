import { CheckCircle2, Sparkles } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { QueuePlayer } from '../../types/domain'

interface RecommendationPanelProps {
  players: QueuePlayer[]
  onSelect: () => void
}

export function RecommendationPanel({ players, onSelect }: RecommendationPanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/50">
      <div className="border-b border-emerald-200 bg-emerald-100/70 px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
          <Sparkles aria-hidden="true" size={17} /> Recommended next group
        </div>
      </div>
      <div className="p-5">
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
        <div className="mt-4 flex gap-2 rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" size={16} />
          <p>
            Alex and Priya have not played yet. Jordan is next by rest time. Maya
            has waited long enough for adjacent-level matching.
          </p>
        </div>
        <Button onClick={onSelect} className="mt-4 w-full sm:w-auto">
          Select recommended four
        </Button>
      </div>
    </section>
  )
}
