import { useEffect, useMemo, useState } from 'react'
import { formatYen, meshFillColor, occupancyColor, occupancyLabel } from '../utils/colors.js'

function PlayIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  )
}

function pctAtIndex(index, maxIndex) {
  if (maxIndex <= 0) return 0
  return Math.max(0, Math.min(100, (index / maxIndex) * 100))
}

function StatPill({ icon, label, value }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur">
      {icon}
      <span className="text-white/55">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  )
}

export default function TimelineSlider({
  timeSlots,
  valueIndex,
  onChangeIndex,
  playIntervalMs = 800,
  series = null,
}) {
  const slots = Array.isArray(timeSlots) ? timeSlots : []
  const [playing, setPlaying] = useState(false)

  const maxIndex = useMemo(() => Math.max(0, slots.length - 1), [slots.length])
  const time = slots[valueIndex] ?? '--:--'
  const playDisabled = slots.length <= 1
  const atEnd = valueIndex >= maxIndex

  const meshMaxSeries = series?.meshMax
  const occAvgSeries = series?.occAvg
  const priceAvgSeries = series?.priceAvg

  const hasViz = useMemo(() => {
    if (!slots.length) return false
    if (!Array.isArray(meshMaxSeries) || meshMaxSeries.length !== slots.length) return false
    if (!Array.isArray(occAvgSeries) || occAvgSeries.length !== slots.length) return false
    return true
  }, [meshMaxSeries, occAvgSeries, slots.length])

  const hasPrice = useMemo(() => {
    if (!slots.length) return false
    return Array.isArray(priceAvgSeries) && priceAvgSeries.length === slots.length
  }, [priceAvgSeries, slots.length])

  const hourMarkers = useMemo(() => {
    const markers = []
    for (let i = 0; i < slots.length; i++) {
      const t = slots[i]
      if (typeof t === 'string' && t.endsWith(':00')) markers.push(i)
    }
    return markers
  }, [slots])

  useEffect(() => {
    if (!playing) return
    if (playDisabled) return

    if (atEnd) {
      setPlaying(false)
      return
    }

    const timer = setTimeout(() => {
      const next = Math.min(maxIndex, valueIndex + 1)
      onChangeIndex(next)
    }, playIntervalMs)

    return () => clearTimeout(timer)
  }, [atEnd, maxIndex, onChangeIndex, playDisabled, playIntervalMs, playing, valueIndex])

  const playButtonClassName = useMemo(() => {
    const base =
      'inline-flex h-9 w-9 items-center justify-center rounded-2xl border shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition active:scale-[0.98]'
    if (playDisabled) return `${base} cursor-not-allowed border-white/10 bg-white/5 text-white/40 opacity-70`
    if (playing)
      return `${base} border-white/10 bg-white/10 text-white hover:bg-white/15`
    return `${base} border-white/10 bg-white/5 text-white hover:bg-white/10`
  }, [playDisabled, playing])

  return (
    <div className="w-[min(760px,calc(100vw-460px))] rounded-3xl border border-white/10 bg-slate-950/55 px-4 py-3 shadow-[0_22px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-emerald-300 shadow-[0_0_0_4px_rgba(255,255,255,0.06)]" />
            <div className="text-xs font-semibold tracking-wide text-white/90">Timeline</div>
          </div>

          <button
            type="button"
            disabled={playDisabled}
            aria-label={playing ? 'Pause timeline' : atEnd ? 'Replay timeline' : 'Play timeline'}
            aria-pressed={playing}
            onClick={() => {
              if (playDisabled) return
              if (playing) return setPlaying(false)
              if (atEnd) onChangeIndex(0)
              setPlaying(true)
            }}
            className={playButtonClassName}
          >
            {playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          {time}
        </div>
      </div>

      {/* Stats */}
      {hasViz ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatPill
              icon={
                <span
                  className="h-2.5 w-2.5 rounded-[5px] shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
                  style={{ backgroundColor: meshFillColor(Number(meshMaxSeries[valueIndex] ?? 0)) }}
                />
              }
              label="Max cell"
              value={Math.round(Number(meshMaxSeries[valueIndex] ?? 0))}
            />

            <StatPill
              icon={
                <span
                  className="h-2.5 w-2.5 rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
                  style={{ backgroundColor: occupancyColor(Number(occAvgSeries[valueIndex] ?? 0)) }}
                />
              }
              label="Avg occ"
              value={`${Math.round(Number(occAvgSeries[valueIndex] ?? 0))}% (${occupancyLabel(
                Number(occAvgSeries[valueIndex] ?? 0),
              )})`}
            />

            {hasPrice ? (
              <StatPill
                icon={
                  <span className="h-2.5 w-2.5 rounded-[5px] bg-white/30 shadow-[0_0_0_1px_rgba(255,255,255,0.2)]" />
                }
                label="Avg price"
                value={`${formatYen(Number(priceAvgSeries[valueIndex] ?? 0))}/hr`}
              />
            ) : null}
          </div>

          {/* Mini heat strip + slider */}
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3 text-[11px] text-white/60">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-[5px]"
                    style={{ backgroundColor: meshFillColor(Number(meshMaxSeries[valueIndex] ?? 0)) }}
                  />
                  Congestion
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: occupancyColor(Number(occAvgSeries[valueIndex] ?? 0)) }}
                  />
                  Occupancy
                </span>
              </div>
              <div className="hidden sm:block text-white/45">Top: mesh • Bottom: parking</div>
            </div>

            <div className="relative mt-2">
              {/* heat strip backdrop */}
              <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
                <div className="relative h-5 w-full overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex h-full w-full flex-col">
                    <div className="flex h-1/2">
                      {meshMaxSeries.map((v, i) => (
                        <div
                          key={i}
                          className="h-full flex-1"
                          style={{ backgroundColor: meshFillColor(Number(v ?? 0)), opacity: 0.92 }}
                        />
                      ))}
                    </div>
                    <div className="flex h-1/2">
                      {occAvgSeries.map((v, i) => (
                        <div
                          key={i}
                          className="h-full flex-1"
                          style={{ backgroundColor: occupancyColor(Number(v ?? 0)), opacity: 0.92 }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* hour markers */}
                  {hourMarkers.map((idx) => (
                    <div
                      key={idx}
                      className="absolute top-0 bottom-0 hidden w-px bg-white/50 sm:block"
                      style={{ left: `${pctAtIndex(idx, maxIndex)}%` }}
                    />
                  ))}

                  {/* current position indicator */}
                  <div
                    className="absolute -top-1 bottom-0 w-[3px] -translate-x-1/2 rounded-full bg-white/80 shadow-[0_0_0_4px_rgba(99,102,241,0.15),0_10px_30px_rgba(0,0,0,0.35)]"
                    style={{ left: `${pctAtIndex(valueIndex, maxIndex)}%` }}
                  />
                </div>
              </div>

              <input
                aria-label="Timeline slider"
                type="range"
                min={0}
                max={maxIndex}
                step={1}
                value={valueIndex}
                onChange={(e) => {
                  setPlaying(false)
                  onChangeIndex(Number(e.target.value))
                }}
                className="timeline-range relative z-10 w-full"
              />
            </div>
          </div>
        </>
      ) : (
        <input
          aria-label="Timeline slider"
          type="range"
          min={0}
          max={maxIndex}
          step={1}
          value={valueIndex}
          onChange={(e) => {
            setPlaying(false)
            onChangeIndex(Number(e.target.value))
          }}
          className="mt-4 w-full accent-indigo-500"
        />
      )}

      {/* Footer */}
      <div className="mt-3 flex justify-between text-[10px] text-white/45">
        <span>{slots[0]}</span>
        <span>{slots.at(-1)}</span>
      </div>
    </div>
  )
}
