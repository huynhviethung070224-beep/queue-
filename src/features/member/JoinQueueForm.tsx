import { UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import type { SkillLevel } from '../../types/domain'

interface JoinQueueFormProps {
  disabled?: boolean
  onJoin: (displayName: string, skillLevel: SkillLevel) => void
}

export function JoinQueueForm({ disabled = false, onJoin }: JoinQueueFormProps) {
  const [displayName, setDisplayName] = useState('')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = displayName.trim()

    if (trimmedName.length < 2 || trimmedName.length > 40) {
      setError('Enter a display name between 2 and 40 characters.')
      return
    }

    setError('')
    onJoin(trimmedName, skillLevel)
  }

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="join-queue-title">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
          <UserPlus aria-hidden="true" size={20} />
        </span>
        <div>
          <h2 id="join-queue-title" className="text-lg font-bold text-navy-950">
            Join tonight&apos;s queue
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Choose the level where you feel comfortable playing today.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="display-name" className="form-label">
            Display name
          </label>
          <input
            id="display-name"
            name="displayName"
            type="text"
            autoComplete="nickname"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={40}
            className="form-control"
            placeholder="For example, Ian H."
            aria-describedby={error ? 'display-name-error' : 'display-name-help'}
            aria-invalid={Boolean(error)}
          />
          {error ? (
            <p id="display-name-error" role="alert" className="mt-2 text-sm text-red-700">
              {error}
            </p>
          ) : (
            <p id="display-name-help" className="mt-2 text-xs text-slate-500">
              Your name will be visible to people at the club.
            </p>
          )}
        </div>

        <fieldset>
          <legend className="form-label">Skill level</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map(
              (level) => (
                <label
                  key={level}
                  className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm font-semibold capitalize transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-600 ${
                    skillLevel === level
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="skillLevel"
                    value={level}
                    checked={skillLevel === level}
                    onChange={() => setSkillLevel(level)}
                    className="sr-only"
                  />
                  {level}
                </label>
              ),
            )}
          </div>
        </fieldset>

        <Button type="submit" disabled={disabled} className="w-full">
          Join queue
        </Button>
      </form>
    </section>
  )
}
