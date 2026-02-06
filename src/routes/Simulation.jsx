import html2canvas from 'html2canvas'
import { useCallback, useMemo, useRef, useState } from 'react'
import ChatPanel from '../components/ChatPanel.jsx'
import ExplanationPanel from '../components/ExplanationPanel.jsx'
import FlowArrows from '../components/FlowArrows.jsx'
import MapView from '../components/MapView.jsx'
import { BASE_MESH_GEOJSON, BASE_PARKING_LOTS, OTARU_CANAL_CENTER, TIME_SLOTS } from '../data/mockData.js'
import { formatYen } from '../utils/colors.js'
import { mean } from '../utils/geo.js'
import { buildScenarioContext, CASES, effectiveMeshPeopleCount, effectiveParkingAtTime, scenarioArrows } from '../utils/simCases.js'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function nextPaint() {
  await new Promise((r) => requestAnimationFrame(() => r()))
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
  const [hideTilesForCapture, setHideTilesForCapture] = useState(false)

  const mapCaptureRef = useRef(null)

  const caseDef = selectedCaseId ? CASES[selectedCaseId] : null
  const activeMapCaseId = mapCaseOverride === null ? selectedCaseId : mapCaseOverride === 'none' ? null : mapCaseOverride

  const selectedScenarioContext = useMemo(
    () => buildScenarioContext({ caseId: selectedCaseId, meshGeojson: BASE_MESH_GEOJSON, timeIndex: selectedTimeIndex }),
    [selectedCaseId, selectedTimeIndex],
  )

  const mapScenarioContext = useMemo(
    () => buildScenarioContext({ caseId: activeMapCaseId, meshGeojson: BASE_MESH_GEOJSON, timeIndex: selectedTimeIndex }),
    [activeMapCaseId, selectedTimeIndex],
  )

  const arrows = useMemo(() => scenarioArrows({ caseId: activeMapCaseId, context: mapScenarioContext }), [activeMapCaseId, mapScenarioContext])

  const getPeopleCount = useCallback(
    (feature, timeIndex) => effectiveMeshPeopleCount({ feature, timeIndex, caseId: activeMapCaseId, context: mapScenarioContext }),
    [activeMapCaseId, mapScenarioContext],
  )

  const getLotAtTime = useCallback(
    (lot, timeIndex) => effectiveParkingAtTime({ lot, timeIndex, caseId: activeMapCaseId, context: mapScenarioContext }),
    [activeMapCaseId, mapScenarioContext],
  )

  const selectedMetrics = useMemo(() => {
    if (!selectedCaseId) return []

    const baseMaxPeople = Math.max(
      ...BASE_MESH_GEOJSON.features.map((f) => f?.properties?.timeSeries?.[selectedTimeIndex]?.peopleCount ?? 0),
    )
    const afterMaxPeople = Math.max(
      ...BASE_MESH_GEOJSON.features.map((f) =>
        effectiveMeshPeopleCount({ feature: f, timeIndex: selectedTimeIndex, caseId: selectedCaseId, context: selectedScenarioContext }),
      ),
    )

    const baseAvgOcc = mean(
      BASE_PARKING_LOTS.map((l) => l?.timeSeries?.[selectedTimeIndex]?.occupancyPercent ?? 0),
    )
    const afterAvgOcc = mean(
      BASE_PARKING_LOTS.map(
        (l) =>
          effectiveParkingAtTime({ lot: l, timeIndex: selectedTimeIndex, caseId: selectedCaseId, context: selectedScenarioContext })
            .occupancyPercent ?? 0,
      ),
    )

    const baseAvgPrice = mean(BASE_PARKING_LOTS.map((l) => l?.timeSeries?.[selectedTimeIndex]?.price ?? 0))
    const afterAvgPrice = mean(
      BASE_PARKING_LOTS.map(
        (l) =>
          effectiveParkingAtTime({ lot: l, timeIndex: selectedTimeIndex, caseId: selectedCaseId, context: selectedScenarioContext }).price ??
          0,
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

  const captureMapPng = useCallback(async () => {
    const root = mapCaptureRef.current
    const el = root?.querySelector?.('.leaflet-container') ?? root
    if (!el) throw new Error('Map element not found')

    try {
      const canvas = await html2canvas(el, { useCORS: true, backgroundColor: '#ffffff', scale: 2 })
      return { dataUrl: canvas.toDataURL('image/png'), tilesOmitted: false }
    } catch (err) {
      // Fallback: hide tiles to avoid CORS-tainted screenshots.
      setHideTilesForCapture(true)
      await nextPaint()
      await sleep(120)
      const canvas = await html2canvas(el, { useCORS: false, backgroundColor: '#e2e8f0', scale: 2 })
      const dataUrl = canvas.toDataURL('image/png')
      setHideTilesForCapture(false)
      return { dataUrl, tilesOmitted: true, error: String(err?.message ?? err) }
    }
  }, [])

  const generateReportHtml = useCallback(
    ({ beforeImage, afterImage, tilesNote }) => {
      const title = 'MapAI – Dynamic Pricing Simulation Report'
      const selectedTime = TIME_SLOTS[selectedTimeIndex]
      const range = `${TIME_SLOTS[0]}–${TIME_SLOTS.at(-1)} (15‑min steps)`

      const bullets = (caseDef?.bullets ?? []).map((b) => `<li>${b}</li>`).join('')
      const metricRows = selectedMetrics
        .map(
          (m) =>
            `<tr><td>${m.label}</td><td class="num">${m.before}</td><td class="num">${m.after}</td></tr>`,
        )
        .join('')

      const stamp = new Date().toLocaleString()

      return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
      .wrap { max-width: 980px; margin: 0 auto; padding: 28px 18px; }
      h1 { font-size: 22px; margin: 0; }
      .sub { margin-top: 6px; font-size: 12px; color: #475569; }
      .card { margin-top: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px; }
      .grid { display: grid; gap: 12px; grid-template-columns: 1fr; }
      @media (min-width: 880px) { .grid { grid-template-columns: 1fr 1fr; } }
      img { width: 100%; border-radius: 12px; border: 1px solid #e2e8f0; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { padding: 10px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
      th { font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: .06em; }
      td.num { text-align: right; font-variant-numeric: tabular-nums; }
      ul { margin: 8px 0 0; padding-left: 18px; }
      .note { margin-top: 10px; font-size: 12px; color: #475569; }
      .k { display: inline-block; min-width: 140px; color: #475569; font-size: 12px; }
      .v { font-weight: 600; font-size: 12px; }
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
        <div style="font-weight:700; font-size:14px;">What changed</div>
        <ul>${bullets}</ul>
      </div>

      <div class="card">
        <div style="font-weight:700; font-size:14px;">Before / After Summary</div>
        <table>
          <thead>
            <tr><th>Metric</th><th class="num">Before</th><th class="num">After</th></tr>
          </thead>
          <tbody>${metricRows}</tbody>
        </table>
      </div>

      <div class="card">
        <div style="font-weight:700; font-size:14px;">Map Screenshots</div>
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

      <div class="note">
        Note: This is a frontend-only mock simulation. Values are synthetic but kept coherent (price ↑ → occupancy does not ↑).
      </div>
    </div>
  </body>
</html>`
    },
    [caseDef, selectedMetrics, selectedTimeIndex],
  )

  const downloadReport = useCallback((html) => {
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
  }, [selectedCaseId, selectedTimeIndex])

  const handleGenerateReport = useCallback(async () => {
    if (!selectedCaseId) return
    setGeneratingReport(true)

    const prevOverride = mapCaseOverride

    try {
      // 1) Capture "before" (baseline) screenshot
      setMapCaseOverride('none')
      await nextPaint()
      await sleep(250)
      const before = await captureMapPng()

      // 2) Capture "after" (case applied) screenshot
      setMapCaseOverride(selectedCaseId)
      await nextPaint()
      await sleep(250)
      const after = await captureMapPng()

      // 3) Restore normal map rendering
      setMapCaseOverride(prevOverride)

      const tilesOmitted = before.tilesOmitted || after.tilesOmitted
      const tilesNote = tilesOmitted
        ? 'Tile screenshots may omit the base map due to cross‑origin browser restrictions; overlays are captured reliably.'
        : ''

      const html = generateReportHtml({
        beforeImage: before.dataUrl,
        afterImage: after.dataUrl,
        tilesNote,
      })

      downloadReport(html)
    } finally {
      setMapCaseOverride(prevOverride)
      setGeneratingReport(false)
      setHideTilesForCapture(false)
    }
  }, [captureMapPng, downloadReport, generateReportHtml, mapCaseOverride, selectedCaseId])

  return (
    <div className="h-full min-h-screen bg-slate-50">
      <div className="flex h-screen w-full">
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
            <div className="absolute inset-0 z-[600] flex items-center justify-center bg-white/60 backdrop-blur">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm">
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
            styleKey={activeMapCaseId ?? 'base'}
            timelineVisible={timelineVisible}
            onChangeTimeIndex={handleChangeTimeIndex}
            transitionMs={transitionMs}
            getPeopleCount={getPeopleCount}
            getLotAtTime={getLotAtTime}
            captureRef={mapCaptureRef}
            hideTiles={hideTilesForCapture}
            overlayLines={arrows.length ? <FlowArrows arrows={arrows} /> : null}
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
