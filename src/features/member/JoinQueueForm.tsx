import { Search, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import type { SkillLevel } from '../../types/domain'
import type { MemberProfileSuggestion } from './memberService'

interface JoinQueueFormProps {
  disabled?: boolean
  initialDisplayName?: string
  initialSkillLevel?: SkillLevel
  onJoin: (displayName: string, skillLevel: SkillLevel) => void | Promise<void>
  onSearchProfiles?: (query: string) => Promise<MemberProfileSuggestion[]>
  onRequestProfileLink?: (playerId: string, displayName: string) => Promise<void>
}

export function JoinQueueForm({
  disabled = false,
  initialDisplayName = '',
  initialSkillLevel = 'intermediate',
  onJoin,
  onSearchProfiles,
  onRequestProfileLink,
}: JoinQueueFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(initialSkillLevel)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState<MemberProfileSuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [identityNotice, setIdentityNotice] = useState('')
  const [requestingProfileId, setRequestingProfileId] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = displayName.trim()

    if (trimmedName.length < 2 || trimmedName.length > 40) {
      setError('Enter a display name between 2 and 40 characters.')
      return
    }

    setError('')
    if (!initialDisplayName && onSearchProfiles) {
      setSearching(true)
      try {
        const matches = await onSearchProfiles(trimmedName)
        const exactMatches = matches.filter(
          (profile) => profile.displayName.trim().toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
        )
        if (exactMatches.length > 0) {
          setSuggestions(exactMatches)
          setIdentityNotice(
            'That display name is already in use. Request ownership of the matching profile or choose a different name.',
          )
          return
        }
      } catch (searchError) {
        setError(searchError instanceof Error ? searchError.message : 'Profile check failed. Please try again.')
        return
      } finally {
        setSearching(false)
      }
    }
    await onJoin(trimmedName, skillLevel)
  }

  async function searchProfiles() {
    const query = displayName.trim()
    if (!onSearchProfiles || query.length < 2) {
      setError('Enter at least two characters before searching.')
      return
    }
    setSearching(true)
    setError('')
    setIdentityNotice('')
    try {
      setSuggestions(await onSearchProfiles(query))
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : 'Profile search failed. Please try again.',
      )
    } finally {
      setSearching(false)
    }
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
            {initialDisplayName
              ? `Current profile: ${initialDisplayName}`
              : 'Create a profile once, or find your existing profile.'}
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
          {!initialDisplayName && onSearchProfiles && (
            <Button
              type="button"
              variant="secondary"
              disabled={disabled || searching}
              className="mt-3 w-full"
              onClick={() => void searchProfiles()}
            >
              <Search aria-hidden="true" size={16} />
              {searching ? 'Searching…' : 'Search existing profiles'}
            </Button>
          )}
          {suggestions.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-950">
                Possible existing profiles
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-900">
                If one is yours, request access. Selecting a name never links it automatically.
              </p>
              <ul className="mt-2 space-y-2">
                {suggestions.map((profile) => (
                  <li key={profile.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-amber-950">
                      {profile.displayName} · {profile.skillLevel}
                      {profile.lastJoinedAt
                        ? ` · last joined ${new Date(profile.lastJoinedAt).toLocaleDateString()}`
                        : ' · no prior session date'}
                    </span>
                    {onRequestProfileLink ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-9 shrink-0 px-2 text-xs"
                        disabled={disabled || requestingProfileId === profile.id}
                        onClick={async () => {
                          setRequestingProfileId(profile.id)
                          setIdentityNotice('')
                          try {
                            await onRequestProfileLink(profile.id, profile.displayName)
                            setIdentityNotice(
                              `Access request sent for ${profile.displayName}. An admin must approve it before this browser is linked.`,
                            )
                          } catch (requestError) {
                            setIdentityNotice(
                              requestError instanceof Error
                                ? requestError.message
                                : 'Ownership request failed. Please try again.',
                            )
                          } finally {
                            setRequestingProfileId(null)
                          }
                        }}
                      >
                        {requestingProfileId === profile.id ? 'Sending…' : 'Request access'}
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-500">Ask an admin to verify</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {identityNotice && (
            <p role="status" className="mt-3 text-xs leading-5 text-amber-900">
              {identityNotice}
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

        <Button
          type="submit"
          disabled={disabled}
          className="w-full"
          aria-label="Join queue"
        >
          {initialDisplayName ? 'Join queue' : 'Continue'}
        </Button>
      </form>
    </section>
  )
}
