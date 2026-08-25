import { AlertCircle, CloudOff, LoaderCircle, Radio, RefreshCw } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { CourtCard } from '../features/courts/CourtCard'
import { JoinQueueForm } from '../features/member/JoinQueueForm'
import { LiveQueueList } from '../features/member/LiveQueueList'
import type { MemberService } from '../features/member/memberService'
import { PersonalStatusCard } from '../features/member/PersonalStatusCard'
import { useMemberQueue } from '../features/member/useMemberQueue'

interface MemberPageProps {
  service?: MemberService
}

function LoadingState() {
  return (
    <div className="card grid min-h-64 place-items-center p-8 text-center" role="status">
      <div>
        <LoaderCircle aria-hidden="true" className="mx-auto animate-spin text-emerald-600" size={30} />
        <h1 className="mt-4 text-xl font-bold text-navy-950">Loading club night</h1>
        <p className="mt-2 text-sm text-slate-600">
          Restoring your anonymous member session and current queue status.
        </p>
      </div>
    </div>
  )
}

export function MemberPage({ service }: MemberPageProps) {
  const memberQueue = useMemberQueue(service)

  if (!memberQueue.configured) {
    return (
      <section className="card mx-auto max-w-2xl p-6 sm:p-8" aria-labelledby="setup-title">
        <p className="eyebrow">Setup required</p>
        <h1 id="setup-title" className="mt-2 text-2xl font-bold text-navy-950">
          Connect Supabase to use the member queue
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Add the public project URL and anonymous key to <code>.env.local</code>, then
          restart the development server. The same project configuration powers the
          protected admin area.
        </p>
      </section>
    )
  }

  if (memberQueue.isLoading && !memberQueue.snapshot) return <LoadingState />

  if (!memberQueue.snapshot) {
    return (
      <section className="card mx-auto max-w-2xl p-6 sm:p-8" aria-labelledby="load-error-title">
        <AlertCircle aria-hidden="true" className="text-red-600" size={28} />
        <h1 id="load-error-title" className="mt-3 text-2xl font-bold text-navy-950">
          We could not load the club queue
        </h1>
        <p role="alert" className="mt-2 text-sm text-red-700">
          {memberQueue.error ?? 'The member service is temporarily unavailable.'}
        </p>
        <Button onClick={() => void memberQueue.retry()} className="mt-5">
          <RefreshCw aria-hidden="true" size={16} /> Retry
        </Button>
      </section>
    )
  }

  const { session, member, queuePosition, queue, courts } = memberQueue.snapshot
  const lastUpdated = memberQueue.lastUpdatedAt?.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
  const isOffline = memberQueue.connection === 'offline'

  return (
    <div className="space-y-8">
      {(isOffline || memberQueue.connection === 'reconnecting' || memberQueue.connection === 'error') && (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${isOffline ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-sky-200 bg-sky-50 text-sky-950'}`}
        >
          {isOffline ? (
            <CloudOff aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
          ) : (
            <RefreshCw aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
          )}
          <span>
            {isOffline
              ? 'You are offline. Showing the last known queue; changes are disabled until you reconnect.'
              : memberQueue.connection === 'error'
                ? 'Live updates were interrupted. The last known queue is still visible.'
                : 'Connection restored. Refreshing the authoritative queue state…'}
          </span>
        </div>
      )}

      {memberQueue.error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {memberQueue.error}
        </div>
      )}

      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${session ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
              <span className={`size-2 rounded-full ${session ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
              {session ? 'Session open' : 'No open session'}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
            {session?.name ?? 'Club night is not open yet'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            {session
              ? 'Fewer games and longer rest move players forward. Skill is used only to create comfortable matches.'
              : 'An administrator needs to open a session before members can join the queue.'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Radio aria-hidden="true" className="text-emerald-600" size={16} />
          {lastUpdated ? `Updated ${lastUpdated}` : 'Waiting for live data'}
        </div>
      </section>

      {session ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div>
            {member ? (
              <PersonalStatusCard
                player={member}
                position={queuePosition}
                onLeave={() => void memberQueue.leaveQueue()}
                leaveDisabled={memberQueue.isActionPending || isOffline}
              />
            ) : (
              <JoinQueueForm
                onJoin={(displayName, skillLevel) => void memberQueue.joinQueue(displayName, skillLevel)}
                disabled={memberQueue.isActionPending || isOffline}
              />
            )}
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-600">
              <RefreshCw aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" size={15} />
              Your anonymous member session is stored in this browser, so refreshing the
              page restores your identity and place.
            </div>
          </div>
          <LiveQueueList players={queue} />
        </div>
      ) : (
        <section className="card px-6 py-10 text-center" aria-label="Queue unavailable">
          <h2 className="text-lg font-bold text-navy-950">The queue is currently closed</h2>
          <p className="mt-2 text-sm text-slate-600">
            This page will update automatically when an administrator opens club night.
          </p>
        </section>
      )}

      <section aria-labelledby="courts-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Club floor</p>
            <h2 id="courts-title" className="mt-1 text-xl font-bold text-navy-950">
              Court status
            </h2>
          </div>
          <span className="text-xs text-slate-500">{courts.length} courts total</span>
        </div>
        {courts.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {courts.map((court) => <CourtCard key={court.number} court={court} />)}
          </div>
        ) : (
          <div className="card px-6 py-8 text-center text-sm text-slate-500">
            Court status is not available yet.
          </div>
        )}
      </section>
    </div>
  )
}
