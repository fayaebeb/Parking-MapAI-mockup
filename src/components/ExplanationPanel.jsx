import clsx from 'clsx'

function Metric({ label, before, after }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3 shadow-[0_14px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      {/* subtle glow */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-indigo-500/20 via-fuchsia-500/10 to-emerald-400/10 opacity-70 blur-xl" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/10" />

      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{label}</div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            <div className="text-[11px] text-white/55">Before</div>
            <div className="mt-0.5 font-semibold text-white">{before}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            <div className="text-[11px] text-white/55">After</div>
            <div className="mt-0.5 font-semibold text-white">{after}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ExplanationPanel({
  title,
  subtitle,
  bullets = [],
  metrics = [],
  showReportButton = false,
  onGenerateReport,
  generating = false,
}) {
  return (
    <div className="w-[360px] rounded-3xl border border-white/10 bg-slate-950/55 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-emerald-300 shadow-[0_0_0_4px_rgba(255,255,255,0.06)]" />
            <div className="truncate text-sm font-semibold text-white">{title}</div>
          </div>
          {subtitle ? <div className="mt-1 text-xs leading-relaxed text-white/65">{subtitle}</div> : null}
        </div>
      </div>

      {/* bullets */}
      {bullets.length ? (
        <ul className="mt-3 space-y-2 text-xs text-white/70">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" />
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* metrics */}
      {metrics.length ? (
        <div className="mt-4 grid gap-2">
          {metrics.map((m) => (
            <Metric key={m.label} label={m.label} before={m.before} after={m.after} />
          ))}
        </div>
      ) : null}

      {/* action */}
      {showReportButton ? (
        <>
          <button
            type="button"
            onClick={onGenerateReport}
            disabled={generating}
            className={clsx(
              'mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition active:scale-[0.99]',
              generating
                ? 'cursor-not-allowed border border-white/10 bg-white/5 text-white/45'
                : 'bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-400 text-slate-950 hover:brightness-110',
            )}
          >
            {generating ? 'Generating report…' : 'Generate Report'}
          </button>

          <p className="mt-2 text-[11px] leading-relaxed text-white/55">
            Downloads an HTML report with before/after screenshots (print-to-PDF supported).
          </p>
        </>
      ) : null}
    </div>
  )
}
