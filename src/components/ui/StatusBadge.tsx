import type { CourtStatus, QueueStatus, SkillLevel } from '../../types/domain'

const skillStyles: Record<SkillLevel, string> = {
  beginner: 'bg-sky-50 text-sky-700 ring-sky-200',
  intermediate: 'bg-violet-50 text-violet-700 ring-violet-200',
  advanced: 'bg-amber-50 text-amber-800 ring-amber-200',
}

const statusStyles: Record<CourtStatus | QueueStatus, string> = {
  disabled: 'bg-slate-100 text-slate-600 ring-slate-200',
  available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  waiting: 'bg-sky-50 text-sky-700 ring-sky-200',
  called: 'bg-amber-50 text-amber-800 ring-amber-200',
  playing: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
}

const labelMap: Record<CourtStatus | QueueStatus | SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  disabled: 'Disabled',
  available: 'Available',
  waiting: 'Waiting',
  called: 'Called',
  playing: 'Playing',
}

interface BadgeProps {
  value: SkillLevel | CourtStatus | QueueStatus
  kind: 'skill' | 'status'
}

export function StatusBadge({ value, kind }: BadgeProps) {
  const style =
    kind === 'skill'
      ? skillStyles[value as SkillLevel]
      : statusStyles[value as CourtStatus | QueueStatus]

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}
    >
      {labelMap[value]}
    </span>
  )
}
