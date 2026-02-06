import { Link } from 'react-router-dom'

export default function Current() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Current</h1>
          <p className="mt-2 text-sm text-slate-600">
            Coming soon — this mock focuses on the Future simulation.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Back to Landing
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

