const courtAccents = {
  1: {
    icon: 'bg-amber-100 text-amber-900',
    stripe: 'bg-amber-400',
  },
  2: {
    icon: 'bg-sky-100 text-sky-900',
    stripe: 'bg-sky-400',
  },
  3: {
    icon: 'bg-violet-100 text-violet-900',
    stripe: 'bg-violet-400',
  },
} as const

export function getCourtAccent(courtNumber: 1 | 2 | 3) {
  return courtAccents[courtNumber]
}
