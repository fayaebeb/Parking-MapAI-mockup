import { MESH_LEGEND_STOPS } from '../utils/colors.js'

function LegendCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur">
      <div className="text-xs font-semibold text-slate-900">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

export default function Legends() {
  return (
    <div className="space-y-2">
      <LegendCard title="Mesh Congestion (People)">
        <div className="grid grid-cols-3 gap-1.5">
          {MESH_LEGEND_STOPS.map((s) => (
            <div key={s.label} className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="text-[11px] text-slate-700">{s.label}</span>
            </div>
          ))}
        </div>
      </LegendCard>

      <LegendCard title="Parking Occupancy">
        <div className="flex items-center gap-3 text-[11px] text-slate-700">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
            Low
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
            Medium
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            High
          </span>
        </div>
      </LegendCard>
    </div>
  )
}

