import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { startMockAdminSession } from '../features/auth/mockAdminAuth'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('preview-only')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.includes('@') || password.length < 6) {
      setError('Enter a valid email and a password of at least 6 characters.')
      return
    }

    setError('')
    startMockAdminSession()
    navigate('/admin')
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 py-4 lg:grid-cols-2 lg:items-center lg:py-12">
      <section>
        <p className="eyebrow">Authorized staff only</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy-950 sm:text-4xl">
          Keep club night moving fairly.
        </h1>
        <p className="mt-4 max-w-lg leading-7 text-slate-600">
          Admins can manage sessions, call players, control courts, and complete
          matches. Every protected action will be verified by Supabase in Phase 4.
        </p>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0" size={19} />
          This Phase 1 login is an interface preview. It does not provide real
          authentication or security.
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
          <p className="mt-1 text-sm text-slate-500">Use the preview values to view the dashboard.</p>
        </div>

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
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <Button type="submit" className="w-full">Open admin dashboard</Button>
        </form>
      </section>
    </div>
  )
}
