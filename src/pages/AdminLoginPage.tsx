import { AlertCircle, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAdminAuth } from '../features/auth/useAdminAuth'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const auth = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim()
    if (!normalizedEmail.includes('@') || password.length < 6) {
      setValidationError('Enter a valid email and a password of at least 6 characters.')
      return
    }

    setValidationError('')
    if (await auth.signIn(normalizedEmail, password)) navigate('/admin', { replace: true })
  }

  if (auth.status === 'unconfigured') {
    return (
      <section className="card mx-auto max-w-2xl p-6 sm:p-8" aria-labelledby="admin-setup-title">
        <p className="eyebrow">Setup required</p>
        <h1 id="admin-setup-title" className="mt-2 text-2xl font-bold text-navy-950">
          Connect Supabase before admin sign-in
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Add the public project URL and anonymous key to <code>.env.local</code>, apply
          all migrations, and link the administrator&apos;s Auth UUID in{' '}
          <code>admin_users</code>.
        </p>
      </section>
    )
  }

  if (auth.status === 'loading') {
    return (
      <div className="card mx-auto grid min-h-64 max-w-2xl place-items-center p-8 text-center" role="status">
        <div>
          <LoaderCircle aria-hidden="true" className="mx-auto animate-spin text-emerald-600" size={28} />
          <h1 className="mt-4 text-xl font-bold text-navy-950">Checking admin session</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 py-4 lg:grid-cols-2 lg:items-center lg:py-12">
      <section>
        <p className="eyebrow">Authorized staff only</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy-950 sm:text-4xl">
          Keep club night moving fairly.
        </h1>
        <p className="mt-4 max-w-lg leading-7 text-slate-600">
          Sign in with the email/password account created in Supabase Auth. The account
          must also be linked in the database administrator allowlist.
        </p>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
          <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0" size={19} />
          Authentication identifies the account; every protected RPC independently
          rechecks <code>admin_users</code> before changing club state.
        </div>
      </section>

      <section className="card p-6 sm:p-8" aria-labelledby="admin-login-title">
        <div className="mb-6">
          <span className="grid size-11 place-items-center rounded-xl bg-navy-950 text-white">
            <LockKeyhole aria-hidden="true" size={22} />
          </span>
          <h2 id="admin-login-title" className="mt-4 text-xl font-bold text-navy-950">
            Admin sign in
          </h2>
          <p className="mt-1 text-sm text-slate-500">Use your approved club administrator account.</p>
        </div>

        {auth.status === 'unauthorized' && (
          <div role="alert" className="mb-5 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
            <span>{auth.email} is signed in but is not listed in <code>admin_users</code>.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="admin-email" className="form-label">Email address</label>
            <div className="relative">
              <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" size={18} />
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                className="form-control pl-11"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="admin-password" className="form-label">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              className="form-control"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {(validationError || auth.error) && (
            <p role="alert" className="text-sm text-red-700">
              {validationError || auth.error}
            </p>
          )}
          <Button type="submit" disabled={auth.pending} className="w-full">
            {auth.pending ? 'Signing in…' : 'Sign in securely'}
          </Button>
        </form>
      </section>
    </div>
  )
}
