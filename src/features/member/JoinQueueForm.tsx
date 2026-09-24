import { Search, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import type { SkillLevel } from '../../types/domain'
import type { MemberProfile } from './memberService'

interface JoinQueueFormProps {
  disabled?: boolean
  onCreate: (drexelUserId: string, displayName: string, skillLevel: SkillLevel) => Promise<void>
  onFind: (drexelUserId: string) => Promise<MemberProfile | null>
  onRequestAccess: (drexelUserId: string) => Promise<void>
}

export function JoinQueueForm({ disabled = false, onCreate, onFind, onRequestAccess }: JoinQueueFormProps) {
  const [mode, setMode] = useState<'create' | 'find'>('find')
  const [drexelUserId, setDrexelUserId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate')
  const [foundProfile, setFoundProfile] = useState<MemberProfile | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      if (mode === 'create') await onCreate(drexelUserId, displayName.trim(), skillLevel)
      else {
        setFoundProfile(await onFind(drexelUserId))
        setHasSearched(true)
      }
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Please try again.') }
    finally { setBusy(false) }
  }

  return <section className="card p-5 sm:p-6" aria-labelledby="member-profile-title">
    <div className="mb-5 flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><UserPlus aria-hidden="true" size={20} /></span><div><h2 id="member-profile-title" className="text-lg font-bold text-navy-950">{mode === 'create' ? 'Create your member profile' : 'Find my profile'}</h2><p className="mt-1 text-sm text-slate-600">Your Drexel User ID identifies one long-term profile. An admin must approve all requests.</p></div></div>
    <div className="mb-5 flex gap-2"><Button type="button" variant={mode === 'find' ? 'primary' : 'secondary'} onClick={() => { setMode('find'); setError(''); setFoundProfile(null); setHasSearched(false) }}>Find my profile</Button><Button type="button" variant={mode === 'create' ? 'primary' : 'secondary'} onClick={() => { setMode('create'); setError(''); setFoundProfile(null); setHasSearched(false) }}>Create new profile</Button></div>
    <form onSubmit={(event) => void submit(event)} noValidate className="space-y-5">
      <div><label htmlFor="drexel-user-id" className="form-label">Drexel User ID</label><input id="drexel-user-id" className="form-control" value={drexelUserId} onChange={(event) => setDrexelUserId(event.target.value)} placeholder="For example, abc123" autoCapitalize="none" autoCorrect="off" required /></div>
      {mode === 'create' && <><div><label htmlFor="display-name" className="form-label">Display name</label><input id="display-name" className="form-control" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} required /></div><fieldset><legend className="form-label">Skill level</legend><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{(['beginner','intermediate','advanced'] as SkillLevel[]).map((level) => <label key={level} className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm font-semibold capitalize ${skillLevel === level ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'}`}><input type="radio" name="skillLevel" value={level} checked={skillLevel === level} onChange={() => setSkillLevel(level)} className="sr-only" />{level}</label>)}</div></fieldset></>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={disabled || busy} className="w-full">{busy ? 'Submitting…' : mode === 'create' ? 'Submit for approval' : 'Find profile'}</Button>
    </form>
    {foundProfile && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-bold text-emerald-950">We found your profile</p><p className="mt-1 text-sm text-emerald-900">{foundProfile.displayName} · {foundProfile.skillLevel}</p><Button className="mt-3" disabled={disabled || busy} onClick={() => { setBusy(true); void onRequestAccess(drexelUserId).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Please try again.')).finally(() => setBusy(false)) }}><Search aria-hidden="true" size={16} />Request access</Button></div>}
    {mode === 'find' && hasSearched && !foundProfile && !error && <div role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-bold text-amber-950">No profile found</p><p className="mt-1 text-sm text-amber-900">We could not find a profile with that Drexel User ID. Check the ID, or create a new profile if this is your first visit.</p><Button type="button" variant="secondary" className="mt-3" onClick={() => { setMode('create'); setHasSearched(false) }}><UserPlus aria-hidden="true" size={16} />Create a new profile</Button></div>}
  </section>
}
