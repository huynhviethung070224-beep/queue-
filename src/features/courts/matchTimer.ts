export function getRemainingMatchSeconds(
  startedAt: string,
  durationSeconds: number,
  now = Date.now(),
) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - new Date(startedAt).getTime()) / 1_000),
  )
  return Math.max(0, durationSeconds - elapsedSeconds)
}

export function formatRemainingMatchTime(remainingSeconds: number) {
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
