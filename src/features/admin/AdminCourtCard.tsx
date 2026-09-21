import { Clock3, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { getCourtDisplayName } from '../../config/app'
import {
  formatRemainingMatchTime,
  getRemainingMatchSeconds,
} from '../courts/matchTimer'
import type { AdminCourt } from './adminService'

interface AdminCourtCardProps {
  court: AdminCourt
  disabled?: boolean
  onAction: (
    court: AdminCourt,
    action: 'start' | 'cancel' | 'end' | 'toggle',
  ) => void
}

export function AdminCourtCard({
  court,
  disabled = false,
  onAction,
}: AdminCourtCardProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(
    court.matchDurationSeconds ?? 0,
  )

  useEffect(() => {
    const matchStartedAt = court.matchStartedAt
    if (court.status !== 'playing' || !matchStartedAt) return
    const durationSeconds = court.matchDurationSeconds
    if (!durationSeconds) return
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
    <article className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-navy-950">
            <MapPin aria-hidden="true" size={18} />
          </span>
          <h3 className="font-bold text-navy-950">{getCourtDisplayName(court.number)}</h3>
        </div>
        <StatusBadge kind="status" value={court.status} />
      </div>

      <div className="mt-4 min-h-12 text-sm text-slate-600">
        {court.playerNames ? court.playerNames.join(' · ') : 'No active match'}
        {court.status === 'playing' && (
          <span className="mt-2 flex items-center gap-1.5 font-semibold text-fuchsia-700">
            <Clock3 aria-hidden="true" size={15} />{' '}
            {remainingSeconds === 0
              ? 'Time’s up'
              : `${formatRemainingMatchTime(remainingSeconds)} remaining`}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {court.status === 'called' && (
          <>
            <Button disabled={disabled} className="flex-1" onClick={() => onAction(court, 'start')}>Start</Button>
            <Button disabled={disabled} variant="secondary" className="flex-1" onClick={() => onAction(court, 'cancel')}>Cancel</Button>
          </>
        )}
        {court.status === 'playing' && (
          <Button disabled={disabled} className="w-full" onClick={() => onAction(court, 'end')}>End match</Button>
        )}
        {(court.status === 'available' || court.status === 'disabled') && (
          <Button disabled={disabled} variant="secondary" className="w-full" onClick={() => onAction(court, 'toggle')}>
            {court.status === 'disabled' ? 'Enable court' : 'Disable court'}
          </Button>
        )}
      </div>
    </article>
  )
}
