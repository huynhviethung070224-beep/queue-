import { Clock3, MapPin, Trophy } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { QueuePlayer } from '../../types/domain'

interface PersonalStatusCardProps {
  player: QueuePlayer
  position: number
  onLeave?: () => void
}

export function PersonalStatusCard({
  player,
  position,
  onLeave,
}: PersonalStatusCardProps) {
  const isCalled = player.status === 'called'
  const isPlaying = player.status === 'playing'

  return (
    <section
      className={`card overflow-hidden ${isCalled ? 'ring-2 ring-amber-400' : ''}`}
      aria-labelledby="your-status-title"
    >
      {(isCalled || isPlaying) && (
        <div
          className={`flex items-center gap-3 px-5 py-4 text-sm font-semibold ${
            isCalled
              ? 'bg-amber-100 text-amber-950'
              : 'bg-fuchsia-100 text-fuchsia-950'
          }`}
          role="status"
        >
          <MapPin aria-hidden="true" size={20} />
          {isCalled
            ? `You have been called to Court ${player.courtNumber}. Please check in now.`
            : `Your match is playing on Court ${player.courtNumber}.`}
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Your status</p>
            <h2 id="your-status-title" className="mt-1 text-xl font-bold text-navy-950">
              {player.displayName}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge kind="status" value={player.status} />
            <StatusBadge kind="skill" value={player.skillLevel} />
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-3 divide-x divide-slate-200 rounded-xl bg-slate-50 py-4 text-center">
          <div className="px-2">
            <dt className="text-xs text-slate-500">Position</dt>
            <dd className="mt-1 text-lg font-bold text-navy-950">#{position}</dd>
          </div>
          <div className="px-2">
            <dt className="flex items-center justify-center gap-1 text-xs text-slate-500">
              <Clock3 aria-hidden="true" size={13} /> Wait
            </dt>
            <dd className="mt-1 text-lg font-bold text-navy-950">
              {player.waitMinutes}m
            </dd>
          </div>
          <div className="px-2">
            <dt className="flex items-center justify-center gap-1 text-xs text-slate-500">
              <Trophy aria-hidden="true" size={13} /> Games
            </dt>
            <dd className="mt-1 text-lg font-bold text-navy-950">
              {player.gamesPlayed}
            </dd>
          </div>
        </dl>

        {player.status === 'waiting' && onLeave && (
          <Button variant="secondary" onClick={onLeave} className="mt-5 w-full sm:w-auto">
            Leave queue
          </Button>
        )}
      </div>
    </section>
  )
}
