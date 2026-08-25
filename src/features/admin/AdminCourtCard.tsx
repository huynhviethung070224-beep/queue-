import { Clock3, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const matchStartedAt = court.matchStartedAt
    if (court.status !== 'playing' || !matchStartedAt) return
    const updateElapsed = () => {
      setElapsedSeconds(
        Math.max(
          0,
          Math.floor((Date.now() - new Date(matchStartedAt).getTime()) / 1_000),
        ),
      )
    }
    const initialTimer = window.setTimeout(updateElapsed, 0)
    const interval = window.setInterval(updateElapsed, 1_000)
    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(interval)
    }
  }, [court.matchStartedAt, court.status])

  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-navy-950">
            <MapPin aria-hidden="true" size={18} />
          </span>
          <h3 className="font-bold text-navy-950">{court.name}</h3>
        </div>
        <StatusBadge kind="status" value={court.status} />
      </div>

      <div className="mt-4 min-h-12 text-sm text-slate-600">
        {court.playerNames ? court.playerNames.join(' · ') : 'No active match'}
        {court.status === 'playing' && (
          <span className="mt-2 flex items-center gap-1.5 font-semibold text-fuchsia-700">
            <Clock3 aria-hidden="true" size={15} /> {Math.floor(elapsedSeconds / 60)}m{' '}
            {elapsedSeconds % 60}s elapsed
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
