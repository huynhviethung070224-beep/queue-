import { CircleDot, ShieldCheck, Wifi } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { APP_CONFIG } from '../../config/app'

export function AppShell() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-50 -translate-y-20 rounded-lg bg-navy-950 px-4 py-2 text-sm font-semibold text-white focus:translate-y-0"
      >
        Skip to content
      </a>
      <header className="border-b border-slate-200 bg-navy-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-500 text-navy-950">
              <CircleDot aria-hidden="true" size={24} />
            </span>
            <span>
              <span className="block text-sm font-bold leading-tight sm:text-base">
                {APP_CONFIG.appName}
              </span>
              <span className="hidden text-xs text-slate-300 sm:block">
                {APP_CONFIG.clubName}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 text-xs font-medium text-emerald-300 sm:flex">
              <Wifi aria-hidden="true" size={15} />{' '}
              {isAdmin ? 'Secure admin controls' : 'Live member queue'}
            </span>
            <Link
              to={isAdmin ? '/' : '/admin/login'}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <ShieldCheck aria-hidden="true" size={17} />
              {isAdmin ? 'Member view' : 'Admin'}
            </Link>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl px-4 py-6 focus:outline-none sm:px-6 sm:py-8 lg:px-8"
      >
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>{APP_CONFIG.clubName} · Fair court time for everyone</span>
          <span>
            {isAdmin
              ? 'Admin access verified by Supabase and PostgreSQL'
              : 'Member data powered by Supabase'}
          </span>
        </div>
      </footer>
    </div>
  )
}
