import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PresidentBadge } from '../../components/ui/RoleBadge'
import { isPresident } from '../../components/ui/role'
import type { AdminMember } from './adminService'

interface MemberDirectoryProps {
  members: AdminMember[]
  disabled?: boolean
  pendingAction: string | null
  onSetPayment: (
    playerId: string,
    displayName: string,
    isPaid: boolean,
  ) => void
  onDelete: (playerId: string, displayName: string) => void
  onSetArchived: (playerId: string, displayName: string, archived: boolean) => void
}

export function MemberDirectory({
  members,
  disabled = false,
  pendingAction,
  onSetPayment,
  onDelete,
  onSetArchived,
}: MemberDirectoryProps) {
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const visibleMembers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    const scopedMembers = members.filter((member) => member.isArchived === showArchived)
    if (!normalized) return scopedMembers
    return scopedMembers.filter((member) =>
      member.displayName.toLocaleLowerCase().includes(normalized),
    )
  }, [members, query, showArchived])

  return (
    <section className="card overflow-hidden" aria-labelledby="member-directory-title">
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <p className="eyebrow">Admin only</p>
        <h2 id="member-directory-title" className="mt-1 text-lg font-bold text-navy-950">
          Persistent member directory
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Payment status is private and never changes queue fairness.
        </p>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Member directories">
          <Button type="button" variant={showArchived ? 'secondary' : 'primary'} role="tab" aria-selected={!showArchived} onClick={() => { setShowArchived(false); setQuery('') }}>
            Active members ({members.filter((member) => !member.isArchived).length})
          </Button>
          <Button type="button" variant={showArchived ? 'primary' : 'secondary'} role="tab" aria-selected={showArchived} onClick={() => { setShowArchived(true); setQuery('') }}>
            Archived members ({members.filter((member) => member.isArchived).length})
          </Button>
        </div>
        <label htmlFor="member-search" className="form-label mt-4">
          Search {showArchived ? 'archived' : 'active'} members
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={17}
          />
          <input
            id="member-search"
            type="search"
            className="form-control pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${showArchived ? 'archived' : 'active'} members`}
          />
        </div>
      </div>

      {visibleMembers.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">No matching members.</p>
      ) : (
        <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
          {visibleMembers.map((member) => {
            const president = !member.isArchived && isPresident(member.displayName)
            const pending = pendingAction === `payment-${member.id}`
            const deleting = pendingAction === `delete-member-${member.id}`
            const archiving = pendingAction === `archive-member-${member.id}`
            return (
              <li
                key={member.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {member.displayName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge kind="skill" value={member.skillLevel} />
                    {president && <PresidentBadge />}
                    {member.isArchived && <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700">Archived</span>}
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${member.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}
                    >
                      {member.isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!member.isArchived && <Button
                    variant="secondary"
                    disabled={disabled || pending || deleting || archiving}
                    onClick={() => onSetPayment(member.id, member.displayName, !member.isPaid)}
                  >
                    {pending ? 'Saving…' : `Mark ${member.isPaid ? 'Unpaid' : 'Paid'}`}
                  </Button>}
                  {!member.isArchived && <Button
                    variant="danger"
                    disabled={disabled || pending || deleting || archiving}
                    onClick={() => onDelete(member.id, member.displayName)}
                  >
                      {deleting ? 'Deleting…' : 'Permanently delete'}
                  </Button>}
                  <Button
                    variant="ghost"
                    disabled={disabled || pending || deleting || archiving}
                    onClick={() => onSetArchived(member.id, member.displayName, !member.isArchived)}
                  >
                    {archiving ? 'Saving…' : member.isArchived ? 'Restore member' : 'Archive member'}
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
