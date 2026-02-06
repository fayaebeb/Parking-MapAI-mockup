import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/70 p-8 shadow-sm backdrop-blur">
          <div className="text-center">
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              MapAI
              <span className="rounded-full bg-white/15 px-2 py-0.5 font-medium">Mock</span>
            </div>
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-slate-900">
              Dynamic Pricing Parking Lot System
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Visualize predicted overtourism congestion near Otaru Canal, Hokkaido — and test pricing strategies.
            </p>
          </div>

          <div className="mt-7 grid gap-3">
            <button
              type="button"
              onClick={() => navigate('/current')}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
            >
              Current
            </button>
            <button
              type="button"
              onClick={() => navigate('/simulation')}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Future
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Frontend-only prototype • React + Tailwind + OpenStreetMap
          </p>
        </div>
      </div>
    </div>
  )
}

