import { useId, useState } from 'react'
import { MESH_LEGEND_STOPS } from '../utils/colors.js'

function Panel({ title = 'Legends', hint, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const contentId = useId()

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 p-3 shadow-[0_22px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      {/* soft glow */}
      <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-r from-indigo-500/18 via-fuchsia-500/10 to-emerald-400/10 opacity-70 blur-xl" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/10" />

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-wide text-white/90">{title}</div>
            {hint ? <div className="mt-0.5 text-[11px] text-white/55">{hint}</div> : null}
          </div>

          <svg
            viewBox="0 0 20 20"
            fill="none"
            className={[
              'mt-0.5 h-4 w-4 shrink-0 text-white/70 transition-transform duration-200',
              open ? 'rotate-180' : 'rotate-0',
            ].join(' ')}
            aria-hidden="true"
          >
            <path
              d="M5 8l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div
          id={contentId}
          className={[
            'grid transition-[grid-template-rows,opacity,margin-top] duration-200 ease-out',
            open ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 mt-0',
          ].join(' ')}
        >
          <div className="overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  )
}

function LegendCard({ title, hint, children }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-wide text-white/90">{title}</div>
          {hint ? <div className="mt-0.5 text-[11px] text-white/55">{hint}</div> : null}
        </div>
        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-emerald-300 shadow-[0_0_0_4px_rgba(255,255,255,0.06)]" />
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function GradientBar({ children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex h-2.5 w-full">{children}</div>
    </div>
  )
}

function Chip({ color, shape = 'square', label }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2 py-1">
      <span
        className={shape === 'dot' ? 'h-2.5 w-2.5 rounded-full' : 'h-2.5 w-2.5 rounded-[5px]'}
        style={{ backgroundColor: color, boxShadow: '0 0 0 1px rgba(255,255,255,0.22)' }}
      />
      <span className="text-[11px] text-white/75">{label}</span>
    </div>
  )
}

export default function Legends() {
  return (
    <Panel title="Legends" hint="Click to expand/collapse all" defaultOpen>
      <div className="space-y-2">
        <LegendCard title="Mesh Congestion (People)" hint="Heat color per 250m cell">
          <GradientBar>
            {MESH_LEGEND_STOPS.map((s) => (
              <div key={s.label} className="h-full flex-1" style={{ backgroundColor: s.color }} />
            ))}
          </GradientBar>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {MESH_LEGEND_STOPS.map((s) => (
              <Chip key={s.label} color={s.color} shape="square" label={s.label} />
            ))}
          </div>
        </LegendCard>

        <LegendCard title="Parking Occupancy" hint="Circle fill color">
          <GradientBar>
            <div className="h-full flex-1" style={{ backgroundColor: '#22c55e' }} />
            <div className="h-full flex-1" style={{ backgroundColor: '#f59e0b' }} />
            <div className="h-full flex-1" style={{ backgroundColor: '#ef4444' }} />
          </GradientBar>

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <Chip color="#22c55e" shape="dot" label="Low (0–44%)" />
            <Chip color="#f59e0b" shape="dot" label="Med (45–74%)" />
            <Chip color="#ef4444" shape="dot" label="High (75%+)" />
          </div>
        </LegendCard>

        <LegendCard title="Lot Capacity" hint="Circle size scale">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="inline-block rounded-full border border-white/30 bg-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
                style={{ width: 14, height: 14 }}
              />
              <span className="text-[11px] text-white/70">~50 spaces</span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className="inline-block rounded-full border border-white/30 bg-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
                style={{ width: 22, height: 22 }}
              />
              <span className="text-[11px] text-white/70">~160+ spaces</span>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-white/55">
            Hover for quick stats • Click a lot for details
          </div>
        </LegendCard>
      </div>
    </Panel>
  )
}
