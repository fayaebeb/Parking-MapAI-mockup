import { useCallback, useMemo, useRef, useState } from 'react'
import ChatPanel from '../components/ChatPanel.jsx'
import ExplanationPanel from '../components/ExplanationPanel.jsx'
import FlowArrows from '../components/FlowArrows.jsx'
import MapView from '../components/MapView.jsx'
import { BASE_MESH_GEOJSON, BASE_PARKING_LOTS, OTARU_CANAL_CENTER, TIME_SLOTS } from '../data/mockData.js'
import { formatYen } from '../utils/colors.js'
import { mean } from '../utils/geo.js'
import {
  buildScenarioContext,
  CASES,
  effectiveMeshPeopleCount,
  effectiveParkingAtTime,
  scenarioArrows,
} from '../utils/simCases.js'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function nextPaint() {
  await new Promise((r) => requestAnimationFrame(() => r()))
}

function createPlaceholderPng({ label, width = 1024, height = 640 } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // Dark gradient background
  const g = ctx.createLinearGradient(0, 0, width, height)
  g.addColorStop(0, '#020617')
  g.addColorStop(1, '#0b1220')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, width, height)

  // Subtle grid
  ctx.globalAlpha = 0.16
  ctx.strokeStyle = 'rgba(255,255,255,0.20)'
  for (let x = 0; x < width; x += 48) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y < height; y += 48) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = '700 30px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
  ctx.fillText('MapAI – Screenshot unavailable', 44, 84)

  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.font = '14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
  ctx.fillText(label ?? 'Browser blocked canvas export (CORS/WebGL).', 44, 114)

  ctx.fillStyle = 'rgba(255,255,255,0.50)'
  ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
  ctx.fillText(
    'Tip: use a MapLibre style/tiles that allow CORS, and keep preserveDrawingBuffer enabled.',
    44,
    140,
  )

  // watermark
  ctx.save()
  ctx.translate(width - 30, height - 20)
  ctx.rotate(-Math.PI / 40)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.font = '800 54px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
  ctx.fillText('MapAI', -190, 0)
  ctx.restore()

  return canvas.toDataURL('image/png')
}

function waitForMapIdle(map, timeoutMs = 2200) {
  return new Promise((resolve) => {
    if (!map) return resolve()
    let done = false

    const finish = () => {
      if (done) return
      done = true
      try {
        map.off('idle', finish)
      } catch {
        // ignore
      }
      resolve()
    }

    try {
      map.on('idle', finish)
    } catch {
      return resolve()
    }

    setTimeout(finish, timeoutMs)
  })
}

export default function Simulation() {
  const initialTimeIndex = useMemo(() => {
    const idx = TIME_SLOTS.indexOf('13:00')
    return idx >= 0 ? idx : Math.floor(TIME_SLOTS.length / 2)
  }, [])

  const [selectedTimeIndex, setSelectedTimeIndex] = useState(initialTimeIndex)
  const [timelineVisible, setTimelineVisible] = useState(false)
  const [hasTimelineChanged, setHasTimelineChanged] = useState(false)
  const [fixVisible, setFixVisible] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState(null) // 'dynamic' | 'shuttle' | null
  const [selectedCaseId, setSelectedCaseId] = useState(null) // 'peak' | 'demand' | 'area' | null
  const [mapCaseOverride, setMapCaseOverride] = useState(null) // null | 'none' | caseId
  const [generatingReport, setGeneratingReport] = useState(false)
  const [mapStyleMode, setMapStyleMode] = useState('default') // 'default' | 'blank'
  const mapRef = useRef(null)

  const caseDef = selectedCaseId ? CASES[selectedCaseId] : null
  const activeMapCaseId =
    mapCaseOverride === null ? selectedCaseId : mapCaseOverride === 'none' ? null : mapCaseOverride

  const selectedScenarioContext = useMemo(
    () =>
      buildScenarioContext({
        caseId: selectedCaseId,
        meshGeojson: BASE_MESH_GEOJSON,
        timeIndex: selectedTimeIndex,
      }),
    [selectedCaseId, selectedTimeIndex],
  )

  const mapScenarioContext = useMemo(
    () =>
      buildScenarioContext({
        caseId: activeMapCaseId,
        meshGeojson: BASE_MESH_GEOJSON,
        timeIndex: selectedTimeIndex,
      }),
    [activeMapCaseId, selectedTimeIndex],
  )

  const arrows = useMemo(
    () => scenarioArrows({ caseId: activeMapCaseId, context: mapScenarioContext }),
    [activeMapCaseId, mapScenarioContext],
  )

  const getPeopleCount = useCallback(
    (feature, timeIndex) =>
      effectiveMeshPeopleCount({ feature, timeIndex, caseId: activeMapCaseId, context: mapScenarioContext }),
    [activeMapCaseId, mapScenarioContext],
  )

  const getLotAtTime = useCallback(
    (lot, timeIndex) =>
      effectiveParkingAtTime({ lot, timeIndex, caseId: activeMapCaseId, context: mapScenarioContext }),
    [activeMapCaseId, mapScenarioContext],
  )

  const timelineSeries = useMemo(() => {
    const meshMax = []
    const occAvg = []
    const priceAvg = []

    for (let timeIndex = 0; timeIndex < TIME_SLOTS.length; timeIndex++) {
      const context = buildScenarioContext({ caseId: activeMapCaseId, meshGeojson: BASE_MESH_GEOJSON, timeIndex })

      let maxPeople = 0
      for (const f of BASE_MESH_GEOJSON.features) {
        const people = effectiveMeshPeopleCount({ feature: f, timeIndex, caseId: activeMapCaseId, context })
        maxPeople = Math.max(maxPeople, Number(people ?? 0))
      }
      meshMax.push(maxPeople)

      let occSum = 0
      let priceSum = 0
      for (const lot of BASE_PARKING_LOTS) {
        const atTime = effectiveParkingAtTime({ lot, timeIndex, caseId: activeMapCaseId, context })
        occSum += Number(atTime?.occupancyPercent ?? 0)
        priceSum += Number(atTime?.price ?? 0)
      }

      const denom = BASE_PARKING_LOTS.length || 1
      occAvg.push(occSum / denom)
      priceAvg.push(priceSum / denom)
    }

    return { meshMax, occAvg, priceAvg }
  }, [activeMapCaseId])

  const selectedMetrics = useMemo(() => {
    if (!selectedCaseId) return []

    const baseMaxPeople = Math.max(
      ...BASE_MESH_GEOJSON.features.map((f) => f?.properties?.timeSeries?.[selectedTimeIndex]?.peopleCount ?? 0),
    )
    const afterMaxPeople = Math.max(
      ...BASE_MESH_GEOJSON.features.map((f) =>
        effectiveMeshPeopleCount({
          feature: f,
          timeIndex: selectedTimeIndex,
          caseId: selectedCaseId,
          context: selectedScenarioContext,
        }),
      ),
    )

    const baseAvgOcc = mean(BASE_PARKING_LOTS.map((l) => l?.timeSeries?.[selectedTimeIndex]?.occupancyPercent ?? 0))
    const afterAvgOcc = mean(
      BASE_PARKING_LOTS.map(
        (l) =>
          effectiveParkingAtTime({
            lot: l,
            timeIndex: selectedTimeIndex,
            caseId: selectedCaseId,
            context: selectedScenarioContext,
          }).occupancyPercent ?? 0,
      ),
    )

    const baseAvgPrice = mean(BASE_PARKING_LOTS.map((l) => l?.timeSeries?.[selectedTimeIndex]?.price ?? 0))
    const afterAvgPrice = mean(
      BASE_PARKING_LOTS.map(
        (l) =>
          effectiveParkingAtTime({
            lot: l,
            timeIndex: selectedTimeIndex,
            caseId: selectedCaseId,
            context: selectedScenarioContext,
          }).price ?? 0,
      ),
    )

    return [
      { label: 'Max mesh people', before: String(baseMaxPeople), after: String(afterMaxPeople) },
      { label: 'Avg occupancy', before: `${Math.round(baseAvgOcc)}%`, after: `${Math.round(afterAvgOcc)}%` },
      { label: 'Avg hourly price', before: `${formatYen(baseAvgPrice)}`, after: `${formatYen(afterAvgPrice)}` },
    ]
  }, [selectedCaseId, selectedScenarioContext, selectedTimeIndex])

  const transitionMs = caseDef?.transitionMs ?? 250

  const handleChangeTimeIndex = useCallback(
    (next) => {
      setSelectedTimeIndex((prev) => {
        if (timelineVisible && next !== prev) setHasTimelineChanged(true)
        return next
      })
    },
    [timelineVisible],
  )

  const handleSelectMethod = useCallback((method) => {
    setSelectedMethod(method)
    setSelectedCaseId(null)
  }, [])

  const handleClearCase = useCallback(() => setSelectedCaseId(null), [])

  const captureMapPng = useCallback(async ({ labelForFallback } = {}) => {
    const map = mapRef.current?.getMap?.()
    if (!map) {
      return { dataUrl: createPlaceholderPng({ label: `${labelForFallback ?? ''} (map not ready)` }), tilesOmitted: true }
    }

    await waitForMapIdle(map)

    try {
      const dataUrl = map.getCanvas().toDataURL('image/png')
      return { dataUrl, tilesOmitted: false }
    } catch (err) {
      // Attempt safer capture using blank base style
      try {
        setMapStyleMode('blank')
        await nextPaint()
        await sleep(180)
        await waitForMapIdle(map)
        const dataUrl = map.getCanvas().toDataURL('image/png')
        setMapStyleMode('default')
        return { dataUrl, tilesOmitted: true, error: String(err?.message ?? err) }
      } catch (err2) {
        setMapStyleMode('default')
        return {
          dataUrl: createPlaceholderPng({
            label: `${labelForFallback ?? 'Screenshot failed'} (CORS/WebGL export blocked)`,
          }),
          tilesOmitted: true,
          error: String(err2?.message ?? err2),
        }
      }
    }
  }, [])

  const generateReportHtml = useCallback(
    ({ beforeImage, afterImage, tilesNote }) => {
      const title = 'MapAI – Dynamic Pricing Simulation Report'
      const selectedTime = TIME_SLOTS[selectedTimeIndex]
      const range = `${TIME_SLOTS[0]}–${TIME_SLOTS.at(-1)} (15-min steps)`

      const bullets = (caseDef?.bullets ?? []).map((b) => `<li>${b}</li>`).join('')
      const metricRows = selectedMetrics
        .map((m) => `<tr><td>${m.label}</td><td class="num">${m.before}</td><td class="num">${m.after}</td></tr>`)
        .join('')

      const stamp = new Date().toLocaleString()

      return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      :root { color-scheme: dark; }
      body {
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        background: radial-gradient(1100px 650px at 20% 10%, rgba(99,102,241,0.18), transparent 60%),
                    radial-gradient(900px 520px at 80% 20%, rgba(236,72,153,0.14), transparent 55%),
                    radial-gradient(900px 520px at 50% 100%, rgba(16,185,129,0.10), transparent 60%),
                    #020617;
        color: rgba(255,255,255,0.92);
      }
      .wrap { max-width: 980px; margin: 0 auto; padding: 28px 18px; }
      h1 { font-size: 22px; margin: 0; }
      .sub { margin-top: 6px; font-size: 12px; color: rgba(255,255,255,0.65); }
      .card {
        margin-top: 14px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 18px;
        padding: 14px;
        backdrop-filter: blur(14px);
      }
      .grid { display: grid; gap: 12px; grid-template-columns: 1fr; }
      @media (min-width: 880px) { .grid { grid-template-columns: 1fr 1fr; } }
      img { width: 100%; border-radius: 14px; border: 1px solid rgba(255,255,255,0.12); }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { padding: 10px 10px; border-bottom: 1px solid rgba(255,255,255,0.12); text-align: left; }
      th { font-size: 11px; color: rgba(255,255,255,0.60); text-transform: uppercase; letter-spacing: .10em; }
      td.num { text-align: right; font-variant-numeric: tabular-nums; }
      ul { margin: 8px 0 0; padding-left: 18px; }
      .note { margin-top: 10px; font-size: 12px; color: rgba(255,255,255,0.65); }
      .k { display: inline-block; min-width: 140px; color: rgba(255,255,255,0.60); font-size: 12px; }
      .v { font-weight: 650; font-size: 12px; color: rgba(255,255,255,0.92); }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>${title}</h1>
      <div class="sub">Generated: ${stamp}</div>

      <div class="card">
        <div><span class="k">Time range</span> <span class="v">${range}</span></div>
        <div><span class="k">Selected time</span> <span class="v">${selectedTime}</span></div>
        <div><span class="k">Selected case</span> <span class="v">${caseDef?.name ?? ''}</span></div>
        ${tilesNote ? `<div class="note">${tilesNote}</div>` : ''}
      </div>

      <div class="card">
        <div style="font-weight:750; font-size:14px;">What changed</div>
        <ul>${bullets}</ul>
      </div>

      <div class="card">
        <div style="font-weight:750; font-size:14px;">Before / After Summary</div>
        <table>
          <thead>
            <tr><th>Metric</th><th class="num">Before</th><th class="num">After</th></tr>
          </thead>
          <tbody>${metricRows}</tbody>
        </table>
      </div>

      <div class="card">
        <div style="font-weight:750; font-size:14px;">Map Screenshots</div>
        <div class="sub">Before (baseline) vs After (case applied)</div>
        <div class="grid" style="margin-top: 10px;">
          <div>
            <div class="sub" style="margin: 0 0 8px;">Before</div>
            <img src="${beforeImage}" alt="Map before" />
          </div>
          <div>
            <div class="sub" style="margin: 0 0 8px;">After</div>
            <img src="${afterImage}" alt="Map after" />
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`
    },
    [caseDef, selectedMetrics, selectedTimeIndex],
  )

  const downloadReport = useCallback(
    (html) => {
      const slug = (selectedCaseId ?? 'case').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      const filename = `mapai-report-${slug}-${TIME_SLOTS[selectedTimeIndex].replace(':', '')}.html`
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2500)
    },
    [selectedCaseId, selectedTimeIndex],
  )

  const handleGenerateReport = useCallback(async () => {
    if (!selectedCaseId) return
    setGeneratingReport(true)

    const prevOverride = mapCaseOverride

    try {
      // 1) Capture "before" (baseline) screenshot
      setMapCaseOverride('none')
      await nextPaint()
      await sleep(250)
      const before = await captureMapPng({ labelForFallback: 'Before (baseline)' })

      // 2) Capture "after" (case applied) screenshot
      setMapCaseOverride(selectedCaseId)
      await nextPaint()
      await sleep(250)
      const after = await captureMapPng({ labelForFallback: 'After (case applied)' })

      // 3) Restore normal map rendering
      setMapCaseOverride(prevOverride)

      const tilesOmitted = before.tilesOmitted || after.tilesOmitted
      const tilesNote = tilesOmitted
        ? 'Base map may be omitted in screenshots due to browser cross-origin restrictions.'
        : ''

      const html = generateReportHtml({ beforeImage: before.dataUrl, afterImage: after.dataUrl, tilesNote })
      downloadReport(html)
    } finally {
      setMapCaseOverride(prevOverride)
      setGeneratingReport(false)
      setMapStyleMode('default')
    }
  }, [captureMapPng, downloadReport, generateReportHtml, mapCaseOverride, selectedCaseId])

  return (
    <div className="min-h-screen bg-slate-950">
      {/* top glow background (subtle) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(900px_520px_at_80%_20%,rgba(236,72,153,0.14),transparent_55%),radial-gradient(900px_520px_at_50%_100%,rgba(16,185,129,0.10),transparent_60%)]" />

      <div className="relative flex h-screen w-full">
        {/* Chat panel stays on top visually */}
        <ChatPanel
          selectedTimeLabel={TIME_SLOTS[selectedTimeIndex]}
          timelineVisible={timelineVisible}
          hasTimelineChanged={hasTimelineChanged}
          onShowTimeline={() => setTimelineVisible(true)}
          fixVisible={fixVisible}
          onShowFix={() => setFixVisible(true)}
          selectedMethod={selectedMethod}
          onSelectMethod={handleSelectMethod}
          selectedCaseId={selectedCaseId}
          onSelectCase={setSelectedCaseId}
          onClearCase={handleClearCase}
        />

        <main className="relative flex-1">
          {generatingReport ? (
            <div className="absolute inset-0 z-[600] flex items-center justify-center bg-slate-950/55 backdrop-blur">
              <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white shadow-[0_22px_70px_rgba(0,0,0,0.55)]">
                Generating report…
              </div>
            </div>
          ) : null}

          <MapView
            center={OTARU_CANAL_CENTER}
            meshGeojson={BASE_MESH_GEOJSON}
            parkingLots={BASE_PARKING_LOTS}
            timeSlots={TIME_SLOTS}
            selectedTimeIndex={selectedTimeIndex}
            timelineSeries={timelineSeries}
            timelineVisible={timelineVisible}
            onChangeTimeIndex={handleChangeTimeIndex}
            transitionMs={transitionMs}
            getPeopleCount={getPeopleCount}
            getLotAtTime={getLotAtTime}
            mapRef={mapRef}
            mapStyleMode={mapStyleMode}
            overlayLines={arrows.length ? <FlowArrows arrows={arrows} transitionMs={transitionMs} /> : null}
            overlayRight={
              selectedMethod === 'dynamic' && selectedCaseId ? (
                <ExplanationPanel
                  title={caseDef?.name ?? 'Dynamic pricing'}
                  subtitle={`Selected time: ${TIME_SLOTS[selectedTimeIndex]}`}
                  bullets={caseDef?.bullets ?? []}
                  metrics={selectedMetrics}
                  showReportButton
                  onGenerateReport={handleGenerateReport}
                  generating={generatingReport}
                />
              ) : null
            }
          />
        </main>
      </div>
    </div>
  )
}
