import { Clock3, MapPin, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { getCourtDisplayName } from '../../config/app'
import type { Court } from '../../types/domain'
import {
  formatRemainingMatchTime,
  getRemainingMatchSeconds,
} from './matchTimer'

interface CourtCardProps {
  court: Court
}

export function CourtCard({ court }: CourtCardProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(
    court.matchDurationSeconds ?? 0,
  )

  useEffect(() => {
    const matchStartedAt = court.matchStartedAt
    const durationSeconds = court.matchDurationSeconds
    if (court.status !== 'playing' || !matchStartedAt || !durationSeconds) return
    const updateRemaining = () => {
      setRemainingSeconds(
        getRemainingMatchSeconds(matchStartedAt, durationSeconds),
      )
    }
    updateRemaining()
    const interval = window.setInterval(updateRemaining, 1_000)
    return () => {
      window.clearInterval(interval)
    }
  }, [court.matchDurationSeconds, court.matchStartedAt, court.status])

  return (
    <article
      className="card p-5"
      aria-label={`${getCourtDisplayName(court.number)}: ${court.status}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-navy-950">
            <MapPin aria-hidden="true" size={20} />
          </span>
          <h3 className="font-bold text-navy-950">{getCourtDisplayName(court.number)}</h3>
        </div>
        <StatusBadge kind="status" value={court.status} />
      </div>

      {court.playerNames ? (
        <div className="mt-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Users aria-hidden="true" size={14} /> Players
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {court.playerNames.join(' · ')}
          </p>
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-500">Ready for the next group of four.</p>
      )}

      {court.status === 'playing' && court.matchStartedAt && court.matchDurationSeconds && (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-fuchsia-700">
          <Clock3 aria-hidden="true" size={16} />{' '}
          {remainingSeconds === 0
            ? 'Time’s up'
            : `${formatRemainingMatchTime(remainingSeconds)} remaining`}
        </p>
      )}

      {court.status === 'called' && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          Waiting for players to check in
        </p>
      )}
    </article>
  )
}
