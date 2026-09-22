import { DoorOpen, MapPinned } from 'lucide-react'
import { APP_CONFIG } from '../../config/app'
import type { Court, QueuePlayer } from '../../types/domain'

interface RecreationCenterMapProps {
  courts: Court[]
  member: QueuePlayer | null
}

const physicalCourtOrder = [3, 2, 1] as const

function assignedCourtNumber(member: QueuePlayer | null) {
  if (!member || (member.status !== 'called' && member.status !== 'playing')) return null
  return member.courtNumber ?? null
}

export function RecreationCenterMap({ courts, member }: RecreationCenterMapProps) {
  const assignedNumber = assignedCourtNumber(member)
  const courtsByNumber = new Map(courts.map((court) => [court.number, court]))
  const assignmentMessage = assignedNumber
    ? `You are assigned to Court ${assignedNumber} — ${APP_CONFIG.courtSkillLabels[assignedNumber]}.`
    : member?.status === 'waiting'
      ? 'You are currently waiting for a court assignment.'
      : 'Join the queue to receive a court assignment.'

  return (
    <section className="card overflow-hidden" aria-labelledby="recreation-map-title">
      <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
          <MapPinned aria-hidden="true" size={20} />
        </span>
        <div>
          <p className="eyebrow">Recreation center</p>
          <h2 id="recreation-map-title" className="mt-1 text-lg font-bold text-navy-950">Find your court</h2>
        </div>
      </div>

      <div className="bg-navy-950 p-3 sm:p-5">
        <div
          data-testid="court-map-layout"
          className="grid w-full min-w-0 grid-cols-[repeat(3,minmax(0,1fr))_2.25rem] gap-1.5 overflow-hidden rounded-xl border border-amber-300/60 bg-navy-900 p-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_3.5rem] sm:gap-3 sm:p-3"
        >
          {physicalCourtOrder.map((number) => {
            const court = courtsByNumber.get(number)
            const isAssigned = assignedNumber === number
            const level = APP_CONFIG.courtSkillLabels[number]
            const status = court?.status ?? 'unavailable'

            return (
              <article
                key={number}
                data-court-number={number}
                data-assigned={isAssigned ? 'true' : 'false'}
                aria-label={`Court ${number} — ${level}: ${status}${isAssigned ? ', your court' : ''}`}
                className={`relative min-w-0 overflow-hidden rounded-md border-2 bg-sky-950/80 px-1 py-3 text-center text-white sm:rounded-lg sm:px-2 sm:py-5 ${isAssigned ? 'animate-pulse border-amber-300 shadow-[0_0_22px_rgba(251,191,36,0.75)] motion-reduce:animate-none' : 'border-sky-400/70'}`}
              >
                <span aria-hidden="true" className="absolute inset-x-0 top-1/2 border-t border-white/70" />
                <span aria-hidden="true" className="absolute inset-y-0 left-1/2 border-l border-white/45" />
                <div className="relative z-10 flex min-h-24 flex-col items-center justify-between sm:min-h-32">
                  {isAssigned ? <span className="rounded-full bg-amber-300 px-1.5 py-1 text-[8px] font-black uppercase tracking-wide text-navy-950 sm:px-2 sm:text-[10px]">Your court</span> : <span aria-hidden="true" className="h-5" />}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-tight sm:text-sm">Court {number}</p>
                    <p className="mt-1 break-words text-[8px] font-bold uppercase leading-tight text-sky-200 sm:text-[11px]">{level}</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-1.5 py-1 text-[8px] font-bold capitalize text-white sm:px-2 sm:text-[10px]">{status}</span>
                </div>
              </article>
            )
          })}

          <div className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-amber-300/80 bg-amber-300/10 px-1 text-amber-100" aria-label="Recreation center entrance">
            <DoorOpen aria-hidden="true" size={16} />
            <span className="text-[8px] font-black uppercase tracking-wider [writing-mode:vertical-rl] sm:text-[10px]">Entrance</span>
          </div>
        </div>
      </div>

      <p className={`px-5 py-4 text-sm font-semibold sm:px-6 ${assignedNumber ? 'bg-amber-50 text-amber-950' : 'bg-white text-slate-600'}`} role="status">
        {assignmentMessage}
      </p>
    </section>
  )
}

