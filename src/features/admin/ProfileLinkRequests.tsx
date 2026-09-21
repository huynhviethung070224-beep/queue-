import { ShieldCheck, UserRoundCheck, UserRoundX } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { ProfileLinkRequest } from './adminService'

interface ProfileLinkRequestsProps {
  requests: ProfileLinkRequest[]
  disabled?: boolean
  pendingAction: string | null
  onReview: (requestId: string, approve: boolean, displayName: string) => void
}

export function ProfileLinkRequests({
  requests,
  disabled = false,
  pendingAction,
  onReview,
}: ProfileLinkRequestsProps) {
  return (
    <section className="card overflow-hidden" aria-labelledby="profile-link-requests-title">
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <p className="eyebrow">Admin only</p>
        <h2 id="profile-link-requests-title" className="mt-1 text-lg font-bold text-navy-950">
          Ownership requests
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Verify the person in front of you before approving. Approval moves the existing profile to the requesting browser.
        </p>
      </div>
      {requests.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">No pending ownership requests.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {requests.map((request) => {
            const pending = pendingAction === `profile-link-${request.id}`
            return (
              <li key={request.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{request.targetDisplayName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge kind="skill" value={request.targetSkillLevel} />
                    <span className="text-xs text-slate-500">
                      Requested {new Date(request.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="secondary"
                    disabled={disabled || pending}
                    onClick={() => onReview(request.id, false, request.targetDisplayName)}
                  >
                    <UserRoundX aria-hidden="true" size={16} /> Reject
                  </Button>
                  <Button
                    disabled={disabled || pending}
                    onClick={() => onReview(request.id, true, request.targetDisplayName)}
                  >
                    {pending ? <ShieldCheck aria-hidden="true" size={16} /> : <UserRoundCheck aria-hidden="true" size={16} />}
                    {pending ? 'Saving…' : 'Approve'}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
