import clsx from 'clsx'
import { Link } from 'react-router-dom'

function Bubble({ tone = 'system', children }) {
  const base = 'max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm'
  const toneClasses =
    tone === 'user'
      ? 'ml-auto bg-slate-900 text-white'
      : 'mr-auto border border-slate-200 bg-white text-slate-900'
  return <div className={clsx(base, toneClasses)}>{children}</div>
}

function SectionTitle({ children }) {
  return <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</div>
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
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">MapAI</div>
            <div className="text-xs text-slate-500">Dynamic Pricing Prototype</div>
          </div>
          <div className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
            {selectedTimeLabel}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <Link to="/" className="hover:text-slate-700">
            ← Landing
          </Link>
          <span className="font-medium text-slate-600">Scripted chat • no LLM</span>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-auto px-4 py-4">
        <Bubble>Welcome to MapAI. Viewing predicted congestion at {selectedTimeLabel}.</Bubble>
        <Bubble>Hotspots are highlighted in deeper colors. Parking lots shift from green → yellow → red as they fill.</Bubble>

        {timelineVisible ? <Bubble>Drag the timeline slider on the map to preview 15‑minute changes.</Bubble> : null}

        {fixVisible ? (
          <Bubble>
            Choose an intervention method. This prototype focuses on <span className="font-semibold">Dynamic pricing</span>.
          </Bubble>
        ) : null}

        {selectedMethod === 'dynamic' ? (
          <>
            <SectionTitle>Dynamic Pricing</SectionTitle>
            <Bubble>
              Select a case to apply mock pricing rules. The map will update prices, occupancy, and congestion (coherently,
              but purely simulated).
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
            Applied <span className="font-semibold">{PRICING_CASES.find((c) => c.id === selectedCaseId)?.name}</span>.
            Use the map popups to see updated prices.
          </Bubble>
        ) : null}
      </div>

      <div className="border-t border-slate-200 p-4">
        {!timelineVisible ? (
          <button
            type="button"
            onClick={onShowTimeline}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            What would happen?
          </button>
        ) : null}

        {timelineVisible && hasTimelineChanged && !fixVisible ? (
          <button
            type="button"
            onClick={onShowFix}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            How to fix this congestion
          </button>
        ) : null}

        {fixVisible && !selectedMethod ? (
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => onSelectMethod('dynamic')}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Dynamic pricing
            </button>
            <button
              type="button"
              onClick={() => onSelectMethod('shuttle')}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
            >
              Shuttle Guidance (placeholder)
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
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm hover:bg-slate-50"
              >
                <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                <div className="mt-0.5 text-xs text-slate-600">{c.blurb}</div>
              </button>
            ))}
          </div>
        ) : null}

        {selectedMethod === 'dynamic' && selectedCaseId ? (
          <button
            type="button"
            onClick={onClearCase}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            Reset case
          </button>
        ) : null}

        {selectedMethod === 'shuttle' ? (
          <button
            type="button"
            onClick={() => onSelectMethod(null)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            Back
          </button>
        ) : null}
      </div>
    </aside>
  )
}

