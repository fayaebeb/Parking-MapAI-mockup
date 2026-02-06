import clsx from 'clsx'

function Metric({ label, before, after }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="text-[11px] text-white/60">{label}</div>
      <div className="text-[11px] font-semibold text-white tabular-nums">
        {before} <span className="mx-1 text-white/35">→</span> {after}
      </div>
    </div>
  )
}

export default function CasePickerOverlay({
  title = 'Pick a case',
  subtitle = 'Hover a card to preview on the map. Click to apply.',
  cases = [],
  metricsByCaseId = {},
  previewCaseId = null,
  onPreviewCase,
  onSelectCase,
}) {
  return (
    <div className="w-[380px] max-w-[86vw] text-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-emerald-300 shadow-[0_0_0_4px_rgba(255,255,255,0.06)]" />
            <div className="text-sm font-semibold tracking-wide">{title}</div>
          </div>
          <div className="mt-1 text-[11px] leading-relaxed text-white/60">{subtitle}</div>
        </div>

        <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/70 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
          {cases.length} options
        </div>
      </div>

      {/* Cards */}
      <div className="mt-3 grid gap-2">
        {cases.map((c) => {
          const metrics = metricsByCaseId?.[c.id] ?? []
          const isPreview = previewCaseId === c.id

          return (
            <button
              key={c.id}
              type="button"
              onPointerEnter={() => onPreviewCase?.(c.id)}
              onPointerLeave={() => onPreviewCase?.(null)}
              onFocus={() => onPreviewCase?.(c.id)}
              onBlur={() => onPreviewCase?.(null)}
              onClick={() => onSelectCase?.(c.id)}
              className={clsx(
                'group relative w-full overflow-hidden rounded-3xl border p-3 text-left shadow-[0_18px_60px_rgba(0,0,0,0.45)] transition active:scale-[0.99]',
                isPreview
                  ? 'border-indigo-300/35 bg-gradient-to-r from-indigo-500/18 via-fuchsia-500/12 to-emerald-400/12'
                  : 'border-white/10 bg-white/5 hover:bg-white/10',
              )}
            >
              {/* soft glow on hover / preview */}
              <div
                className={clsx(
                  'pointer-events-none absolute -inset-px rounded-3xl opacity-0 blur-xl transition',
                  isPreview ? 'opacity-80' : 'group-hover:opacity-60',
                )}
                style={{
                  background:
                    'linear-gradient(90deg, rgba(99,102,241,0.22), rgba(236,72,153,0.14), rgba(16,185,129,0.12))',
                }}
              />
              <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/10" />

              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-white">{c.name}</div>
                    {c.subtitle ? (
                      <div className="mt-1 text-[11px] leading-relaxed text-white/60">
                        {c.subtitle}
                      </div>
                    ) : null}
                  </div>

                  <div
                    className={clsx(
                      'mt-0.5 shrink-0 rounded-2xl border px-2.5 py-1 text-[11px] font-semibold transition',
                      isPreview
                        ? 'border-indigo-200/30 bg-indigo-500/15 text-white'
                        : 'border-white/10 bg-white/5 text-white/70 group-hover:bg-white/10',
                    )}
                  >
                    {isPreview ? 'Previewing' : 'Preview'}
                  </div>
                </div>

                {metrics.length ? (
                  <div className="mt-3 grid gap-2">
                    {metrics.slice(0, 3).map((m) => (
                      <Metric key={m.label} label={m.label} before={m.before} after={m.after} />
                    ))}
                  </div>
                ) : null}

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-[11px] text-white/45">
                    Hover to preview • Click to apply
                  </div>
                  <div className="text-[11px] font-semibold text-white/80 transition group-hover:text-white">
                    Apply <span className="ml-1 text-white/50 group-hover:text-white/70">→</span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
