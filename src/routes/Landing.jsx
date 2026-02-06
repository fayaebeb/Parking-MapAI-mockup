import { useNavigate } from "react-router-dom"

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* background */}
      <div className="pointer-events-none absolute inset-0">
        {/* soft gradient wash */}
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(99,102,241,0.35),transparent_60%),radial-gradient(1000px_520px_at_80%_30%,rgba(16,185,129,0.18),transparent_55%),radial-gradient(900px_520px_at_50%_90%,rgba(236,72,153,0.18),transparent_60%)]" />
        {/* subtle grid */}
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:56px_56px]" />
        {/* vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/20 to-black/60" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-14">
        <div className="w-full max-w-xl">
          {/* top badge */}
          <div className="mb-6 flex items-center justify-center">
            <div className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 text-[11px] font-black text-slate-950">
                M
              </span>
              <span className="text-xs font-semibold tracking-wide text-white/90">
                MapAI
              </span>
            </div>
          </div>

          {/* card */}
          <div className="relative rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-10">
            {/* glow ring */}
            <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-r from-indigo-500/30 via-fuchsia-500/20 to-emerald-500/20 opacity-70 blur-xl" />
            <div className="pointer-events-none absolute -inset-px rounded-3xl ring-1 ring-white/10" />

            <div className="relative text-center">
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Dynamic Pricing Parking Lot System
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
                Visualize predicted overtourism congestion near Otaru Canal, Hokkaido —
                and test pricing strategies that nudge demand away from hotspots.
              </p>

              {/* mini stat pills */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
                  250m mesh heatmap
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
                  15-min intervals
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
                  Parking occupancy + price
                </span>
              </div>
            </div>

            {/* actions */}
            <div className="relative mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
              <button
                type="button"
                onClick={() => navigate("/current")}
                className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:bg-white/10 active:scale-[0.99]"
              >
                <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(600px_220px_at_50%_0%,rgba(255,255,255,0.14),transparent_70%)]" />
                <span className="relative">Current</span>
                <span className="relative text-white/60 transition group-hover:text-white/80">
                  →
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/simulation")}
                className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-400 px-5 py-4 text-sm font-semibold text-slate-950 shadow-[0_14px_40px_rgba(99,102,241,0.25)] transition hover:brightness-110 active:scale-[0.99]"
              >
                <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(600px_220px_at_50%_0%,rgba(255,255,255,0.35),transparent_70%)]" />
                <span className="relative">Future</span>
                <span className="relative opacity-70 transition group-hover:opacity-90">
                  ✦
                </span>
              </button>
            </div>

            {/* footer hint */}
            <div className="relative mt-6 text-center text-xs text-white/50">
              Tip: start with <span className="text-white/70">Current</span>, then switch to{" "}
              <span className="text-white/70">Future</span> to test dynamic pricing.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
