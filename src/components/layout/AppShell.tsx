import { CircleDot, ShieldCheck } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { APP_CONFIG } from '../../config/app'

export function AppShell() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <div className="app-canvas flex min-h-screen flex-col text-slate-950">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-50 -translate-y-20 rounded-lg bg-navy-950 px-4 py-2 text-sm font-semibold text-white focus:translate-y-0"
      >
        Skip to content
      </a>
      <header className="relative bg-navy-950 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.28),transparent_46%),radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.14),transparent_34%)]"
        />
        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-navy-950 shadow-sm shadow-emerald-900/30 ring-4 ring-white/10">
              <CircleDot aria-hidden="true" size={24} />
            </span>
            <span>
              <span className="block font-display text-sm font-bold leading-tight sm:text-base">
                {APP_CONFIG.appName}
              </span>
              <span className="hidden text-xs text-slate-300 sm:block">
                {APP_CONFIG.clubName}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-semibold text-emerald-100 sm:inline-flex">
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-70 motion-reduce:hidden" />
                <span className="relative size-2 rounded-full bg-emerald-300" />
              </span>
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
        <div aria-hidden="true" className="h-1 bg-linear-to-r from-emerald-400 via-emerald-300 to-amber-300" />
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 focus:outline-none sm:px-6 sm:py-8 lg:px-8"
      >
        <Outlet />
      </main>

      <footer className="border-t border-slate-200/80 bg-white/80">
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
