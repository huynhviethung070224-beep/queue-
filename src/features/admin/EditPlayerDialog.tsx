import { useRef, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import type { QueuePlayer, SkillLevel } from '../../types/domain'

interface EditPlayerDialogProps {
  player: QueuePlayer
  onCancel: () => void
  onSave: (player: QueuePlayer) => void
  pending?: boolean
}

export function EditPlayerDialog({ player, onCancel, onSave, pending = false }: EditPlayerDialogProps) {
  const [displayName, setDisplayName] = useState(player.displayName)
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(player.skillLevel)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  useDialogFocus(dialogRef, nameInputRef, onCancel, pending)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = displayName.trim()
    if (trimmedName.length < 2 || trimmedName.length > 40) {
      setError('Display name must contain between 2 and 40 characters.')
      return
    }
    setError('')
    onSave({ ...player, displayName: trimmedName, skillLevel })
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/60 p-4">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-player-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 id="edit-player-title" className="text-xl font-bold text-navy-950">
          Edit player
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Correct club-visible information only.
        </p>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="edit-display-name" className="form-label">Display name</label>
            <input
              ref={nameInputRef}
              id="edit-display-name"
              className="form-control"
              value={displayName}
              minLength={2}
              maxLength={40}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              aria-describedby={error ? 'edit-player-error' : undefined}
              aria-invalid={Boolean(error)}
            />
            {error && <p id="edit-player-error" role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
          </div>
          <div>
            <label htmlFor="edit-skill-level" className="form-label">Skill level</label>
            <select
              id="edit-skill-level"
              className="form-control"
              value={skillLevel}
              onChange={(event) => setSkillLevel(event.target.value as SkillLevel)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button disabled={pending} variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button disabled={pending} type="submit">{pending ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </form>
      </section>
    </div>
  )
}
