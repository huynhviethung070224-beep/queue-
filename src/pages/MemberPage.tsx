import { Radio, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { CourtCard } from '../features/courts/CourtCard'
import { mockCourts, mockQueuePlayers, mockSession } from '../features/queue/mockData'
import { JoinQueueForm } from '../features/member/JoinQueueForm'
import { LiveQueueList } from '../features/member/LiveQueueList'
import { PersonalStatusCard } from '../features/member/PersonalStatusCard'
import type { QueuePlayer, SkillLevel } from '../types/domain'

export function MemberPage() {
  const [member, setMember] = useState<QueuePlayer | null>(null)

  function joinQueue(displayName: string, skillLevel: SkillLevel) {
    setMember({
      id: 'mock-current-member',
      displayName,
      skillLevel,
      gamesPlayed: 0,
      queuedAt: new Date().toISOString(),
      waitMinutes: 0,
      status: 'waiting',
    })
  }

  const queue = member ? [...mockQueuePlayers, member] : mockQueuePlayers

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
              Session open
            </span>
            <span className="text-xs text-slate-500">7:00–10:00 PM ET</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
            {mockSession.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Fewer games and longer rest move players forward. Skill is used only to
            create comfortable matches.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Radio aria-hidden="true" className="text-emerald-600" size={16} />
          Updated just now
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div>
          {member ? (
            <PersonalStatusCard
              player={member}
              position={queue.length}
              onLeave={() => setMember(null)}
            />
          ) : (
            <JoinQueueForm onJoin={joinQueue} />
          )}
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-600">
            <RefreshCw aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" size={15} />
            Your anonymous member session will keep your place after a refresh once
            Supabase is connected in Phase 3.
          </div>
        </div>
        <LiveQueueList players={queue} />
      </div>

      <section aria-labelledby="courts-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Club floor</p>
            <h2 id="courts-title" className="mt-1 text-xl font-bold text-navy-950">
              Court status
            </h2>
          </div>
          <span className="text-xs text-slate-500">3 courts total</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {mockCourts.map((court) => (
            <CourtCard key={court.number} court={court} />
          ))}
        </div>
      </section>
    </div>
  )
}
