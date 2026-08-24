import { ArrowLeft, MapPinOff } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-xl py-20 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-200 text-slate-600">
        <MapPinOff aria-hidden="true" size={28} />
      </span>
      <p className="eyebrow mt-6">404 · Out of bounds</p>
      <h1 className="mt-2 text-3xl font-extrabold text-navy-950">This page is not on our court.</h1>
      <p className="mt-3 text-slate-600">The address may be incorrect, or the page may have moved.</p>
      <Link to="/" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
        <ArrowLeft aria-hidden="true" size={17} /> Return to member queue
      </Link>
    </section>
  )
}
