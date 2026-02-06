import clsx from 'clsx'

function Metric({ label, before, after }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-[11px] text-slate-500">Before</div>
          <div className="font-semibold text-slate-900">{before}</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-500">After</div>
          <div className="font-semibold text-slate-900">{after}</div>
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
    <div className="w-[360px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-0.5 text-xs text-slate-600">{subtitle}</div> : null}
        </div>
      </div>

      {bullets.length ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-700">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}

      {metrics.length ? (
        <div className="mt-4 grid gap-2">
          {metrics.map((m) => (
            <Metric key={m.label} label={m.label} before={m.before} after={m.after} />
          ))}
        </div>
      ) : null}

      {showReportButton ? (
        <button
          type="button"
          onClick={onGenerateReport}
          disabled={generating}
          className={clsx(
            'mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition',
            generating
              ? 'cursor-not-allowed bg-slate-200 text-slate-600'
              : 'bg-slate-900 text-white hover:bg-slate-800',
          )}
        >
          {generating ? 'Generating report…' : 'Generate Report'}
        </button>
      ) : null}

      {showReportButton ? (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          Downloads an HTML report with before/after screenshots (print-to-PDF supported).
        </p>
      ) : null}
    </div>
  )
}

