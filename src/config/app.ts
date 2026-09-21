export const APP_CONFIG = {
  appName: 'Badminton FairPlay Queue',
  clubName: 'Drexel Badminton Club',
  clubTimezone: 'America/New_York',
  courtCount: 3,
  adjacentSkillWaitMinutes: 15,
  defaultMatchDurationSeconds: 7 * 60,
  courtSkillLabels: {
    1: 'Advanced',
    2: 'Beginner',
    3: 'Intermediate',
  },
} as const

export function getCourtDisplayName(courtNumber: 1 | 2 | 3) {
  return `Court ${courtNumber} · ${APP_CONFIG.courtSkillLabels[courtNumber]}`
}
