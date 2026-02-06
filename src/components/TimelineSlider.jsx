export default function TimelineSlider({ timeSlots, valueIndex, onChangeIndex }) {
  const time = timeSlots[valueIndex] ?? '--:--'

  return (
    <div className="w-[min(720px,calc(100vw-460px))] rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-900">Timeline</div>
        <div className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">{time}</div>
      </div>
      <input
        aria-label="Timeline slider"
        type="range"
        min={0}
        max={Math.max(0, timeSlots.length - 1)}
        step={1}
        value={valueIndex}
        onChange={(e) => onChangeIndex(Number(e.target.value))}
        className="mt-3 w-full accent-slate-900"
      />
      <div className="mt-2 flex justify-between text-[10px] text-slate-500">
        <span>{timeSlots[0]}</span>
        <span>{timeSlots.at(-1)}</span>
      </div>
    </div>
  )
}

