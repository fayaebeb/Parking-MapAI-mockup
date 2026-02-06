import clsx from 'clsx'
import { Link } from 'react-router-dom'

function Bubble({ tone = 'system', children }) {
  const base =
    'max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl'
  const toneClasses =
    tone === 'user'
      ? 'ml-auto border border-white/10 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-400 text-slate-950'
      : 'mr-auto border border-white/10 bg-slate-950/55 text-white'
  return <div className={clsx(base, toneClasses)}>{children}</div>
}

function SectionTitle({ children }) {
  return (
    <div className="mt-6 flex items-center gap-2">
      <div className="h-px flex-1 bg-white/10" />
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{children}</div>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  )
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/80">
      {children}
    </span>
  )
}

export const PRICING_CASES = [
  { id: 'peak', name: 'Case 1: Peak Hours Pricing', blurb: 'Midday higher price, morning lower price.' },
  {
    id: 'demand',
    name: 'Case 2: Demand-Based Pricing',
    blurb: 'Prices respond to occupancy at each time step (animated).',
  },
  {
    id: 'area',
    name: 'Case 3: Area-Based Redistribution',
    blurb: 'Hotspot-adjacent lots price up; surrounding area prices down.',
  },
]

export default function ChatPanel({
  selectedTimeLabel,
  timelineVisible,
  hasTimelineChanged,
  onShowTimeline,
  fixVisible,
  onShowFix,
  selectedMethod,
  onSelectMethod,
  selectedCaseId,
  onSelectCase,
  onClearCase,
}) {
  return (
    <aside className="relative flex h-full w-[380px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-slate-950/70 text-white shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
      {/* ambient header glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(900px_200px_at_20%_0%,rgba(99,102,241,0.22),transparent_70%),radial-gradient(700px_180px_at_80%_10%,rgba(236,72,153,0.18),transparent_70%)]" />

      {/* Header */}
      <div className="relative border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="relative h-8 w-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
  <img
    src="/mascot.png"
    alt="MapAI mascot"
    className="h-full w-full object-cover"
    draggable="false"
  />
</div>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">MapAI</div>
                <div className="truncate text-xs text-white/55">Dynamic Pricing Prototype</div>
              </div>
            </div>
          </div>

          <Pill>{selectedTimeLabel}</Pill>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden>←</span>
            Landing
          </Link>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
            <span className="text-white/55">Live</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="relative flex-1 space-y-3 overflow-auto px-4 py-4">
        <Bubble>
          Welcome to MapAI. Viewing predicted congestion at <span className="font-semibold text-white">{selectedTimeLabel}</span>.
        </Bubble>
        <Bubble>
          Hotspots are highlighted in deeper colors. Parking lots shift from{' '}
          <span className="font-semibold">green → yellow → red</span> as they fill.
        </Bubble>

        {timelineVisible ? <Bubble>Drag the timeline slider on the map to preview 15-minute changes.</Bubble> : null}

        {fixVisible ? (
          <Bubble>
            Choose an intervention method. This prototype focuses on <span className="font-semibold">Dynamic pricing</span>.
          </Bubble>
        ) : null}

        {selectedMethod === 'dynamic' ? (
          <>
            <SectionTitle>Dynamic Pricing</SectionTitle>
            <Bubble>
              Select a case to apply mock pricing rules. The map will update prices, occupancy, and congestion{' '}
              <span className="text-white/70">(coherently, but simulated)</span>.
            </Bubble>
          </>
        ) : null}

        {selectedMethod === 'shuttle' ? (
          <>
            <SectionTitle>Shuttle Guidance</SectionTitle>
            <Bubble>
              Placeholder: a shuttle + wayfinding strategy would steer visitors from hotspots to alternative entry points.
            </Bubble>
          </>
        ) : null}

        {selectedCaseId ? (
          <Bubble>
            Applied{' '}
            <span className="font-semibold">
              {PRICING_CASES.find((c) => c.id === selectedCaseId)?.name}
            </span>
            . Use the map popups to see updated prices.
          </Bubble>
        ) : null}
      </div>

      {/* Action area */}
      <div className="relative border-t border-white/10 p-4">
        {!timelineVisible ? (
          <button
            type="button"
            onClick={onShowTimeline}
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_40px_rgba(99,102,241,0.22)] transition hover:brightness-110 active:scale-[0.99]"
          >
            <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(600px_220px_at_50%_0%,rgba(255,255,255,0.35),transparent_70%)]" />
            <span className="relative">What would happen?</span>
          </button>
        ) : null}

        {timelineVisible && hasTimelineChanged && !fixVisible ? (
          <button
            type="button"
            onClick={onShowFix}
            className="group relative w-full overflow-hidden rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(0,0,0,0.25)] ring-1 ring-white/10 transition hover:bg-white/15 active:scale-[0.99]"
          >
            <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(600px_220px_at_50%_0%,rgba(255,255,255,0.18),transparent_70%)]" />
            <span className="relative">How to fix this congestion</span>
          </button>
        ) : null}

        {fixVisible && !selectedMethod ? (
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => onSelectMethod('dynamic')}
              className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_40px_rgba(99,102,241,0.22)] transition hover:brightness-110 active:scale-[0.99]"
            >
              <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(600px_220px_at_50%_0%,rgba(255,255,255,0.35),transparent_70%)]" />
              <span className="relative">Dynamic pricing</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectMethod('shuttle')}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(0,0,0,0.22)] transition hover:bg-white/10 active:scale-[0.99]"
            >
              Shuttle Guidance <span className="text-white/60">(placeholder)</span>
            </button>
          </div>
        ) : null}

        {selectedMethod === 'dynamic' && !selectedCaseId ? (
          <div className="grid gap-2">
            {PRICING_CASES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCase(c.id)}
                className="group w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left shadow-[0_14px_40px_rgba(0,0,0,0.22)] transition hover:bg-white/10 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{c.name}</div>
                    <div className="mt-0.5 text-xs text-white/60">{c.blurb}</div>
                  </div>
                  <div className="mt-0.5 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/70 transition group-hover:bg-white/10">
                    Apply
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : null}

        {selectedMethod === 'dynamic' && selectedCaseId ? (
          <button
            type="button"
            onClick={onClearCase}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(0,0,0,0.22)] transition hover:bg-white/10 active:scale-[0.99]"
          >
            Reset case
          </button>
        ) : null}

        {selectedMethod === 'shuttle' ? (
          <button
            type="button"
            onClick={() => onSelectMethod(null)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(0,0,0,0.22)] transition hover:bg-white/10 active:scale-[0.99]"
          >
            Back
          </button>
        ) : null}
      </div>
    </aside>
  )
}
