import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import type { QueuePlayer, SkillLevel } from '../../types/domain'

interface EditPlayerDialogProps {
  player: QueuePlayer
  onCancel: () => void
  onSave: (player: QueuePlayer) => void
}

export function EditPlayerDialog({ player, onCancel, onSave }: EditPlayerDialogProps) {
  const [displayName, setDisplayName] = useState(player.displayName)
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(player.skillLevel)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = displayName.trim()
    if (trimmedName.length < 2) return
    onSave({ ...player, displayName: trimmedName, skillLevel })
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/60 p-4">
      <section
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
              id="edit-display-name"
              className="form-control"
              value={displayName}
              minLength={2}
              maxLength={40}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
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
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </section>
    </div>
  )
}
