import { Clock3, MapPin } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { Court } from '../../types/domain'

interface AdminCourtCardProps {
  court: Court
  onAction: (court: Court, action: 'start' | 'cancel' | 'end' | 'toggle') => void
}

export function AdminCourtCard({ court, onAction }: AdminCourtCardProps) {
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
            <Clock3 aria-hidden="true" size={15} /> 19m 24s elapsed
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {court.status === 'called' && (
          <>
            <Button className="flex-1" onClick={() => onAction(court, 'start')}>Start</Button>
            <Button variant="secondary" className="flex-1" onClick={() => onAction(court, 'cancel')}>Cancel</Button>
          </>
        )}
        {court.status === 'playing' && (
          <Button className="w-full" onClick={() => onAction(court, 'end')}>End match</Button>
        )}
        {(court.status === 'available' || court.status === 'disabled') && (
          <Button variant="secondary" className="w-full" onClick={() => onAction(court, 'toggle')}>
            {court.status === 'disabled' ? 'Enable court' : 'Disable court'}
          </Button>
        )}
      </div>
    </article>
  )
}
