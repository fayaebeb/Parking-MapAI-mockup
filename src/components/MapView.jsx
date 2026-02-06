import { useCallback, useMemo, useRef, useState } from 'react'
import MapGL, { Layer, NavigationControl, Popup, Source } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import Legends from './Legends.jsx'
import TimelineSlider from './TimelineSlider.jsx'
import { formatYen, meshFillColor, occupancyColor, occupancyLabel } from '../utils/colors.js'

const DEMO_STYLE_URL =
  'https://api.maptiler.com/maps/streets-v4/style.json?key=uabdCkQNz8KjbO5DdjMb'

const BLANK_STYLE = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#0b1220' } }],
}

const PARKING_RADIUS_EXPR = ['interpolate', ['linear'], ['get', 'totalCapacity'], 50, 7, 160, 11]

function computeBbox(geojson) {
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity

  for (const f of geojson?.features ?? []) {
    const geom = f?.geometry
    if (!geom) continue

    const coords = geom.coordinates
    const visit = (c) => {
      if (!Array.isArray(c)) return
      if (typeof c[0] === 'number' && typeof c[1] === 'number') {
        const [lon, lat] = c
        minLon = Math.min(minLon, lon)
        minLat = Math.min(minLat, lat)
        maxLon = Math.max(maxLon, lon)
        maxLat = Math.max(maxLat, lat)
        return
      }
      for (const child of c) visit(child)
    }
    visit(coords)
  }

  if (![minLon, minLat, maxLon, maxLat].every(Number.isFinite)) return null
  return { minLon, minLat, maxLon, maxLat }
}

function meshColorExpression() {
  return [
    'step',
    ['get', 'peopleCount'],
    'rgba(34,197,94,0.18)', // green
    41,
    'rgba(34,197,94,0.30)',
    81,
    'rgba(250,204,21,0.30)', // yellow
    121,
    'rgba(249,115,22,0.35)', // orange
    161,
    'rgba(244,63,94,0.42)', // rose
    201,
    'rgba(190,18,60,0.55)', // deep red
  ]
}

function occupancyColorExpression() {
  return ['step', ['get', 'occupancyPercent'], '#22c55e', 45, '#f59e0b', 75, '#ef4444']
}

function buildMeshAtTime(meshGeojson, selectedTimeIndex, getPeopleCount) {
  return {
    type: 'FeatureCollection',
    features: (meshGeojson?.features ?? []).map((f) => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        ...(f.properties ?? {}),
        peopleCount: getPeopleCount(f, selectedTimeIndex),
      },
    })),
  }
}

function buildParkingAtTime(parkingLots, selectedTimeIndex, getLotAtTime) {
  return {
    type: 'FeatureCollection',
    features: parkingLots.map((lot) => {
      const atTime = getLotAtTime(lot, selectedTimeIndex)
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lot.lon, lot.lat] },
        properties: {
          id: lot.id,
          name: lot.name,
          totalCapacity: lot.totalCapacity,
          time: atTime.time,
          occupancyPercent: atTime.occupancyPercent,
          price: atTime.price,
        },
      }
    }),
  }
}

// ---------- Fancy popup styling ----------
const popupClassName =
  // Applies to both hover + click popups
  // Note: MapLibre Popup renders .maplibregl-popup-content; we can style from within.
  'mapai-popup'

const popupContentClass =
  'rounded-2xl border border-white/10 bg-slate-950/80 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl'

// tiny helper component to keep markup consistent
function PopupCard({ title, pill, children, subtitle }) {
  return (
    <div className={popupContentClass}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-white">{title}</div>
          {subtitle ? <div className="mt-0.5 text-[11px] text-white/55">{subtitle}</div> : null}
        </div>
        {pill}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-[11px] text-white/55">{label}</div>
      <div className="text-[11px] font-semibold text-white">{value}</div>
    </div>
  )
}

export default function MapView({
  center,
  meshGeojson,
  parkingLots,
  timeSlots,
  selectedTimeIndex,
  timelineSeries = null,
  timelineVisible,
  onChangeTimeIndex,
  transitionMs = 250,
  getPeopleCount,
  getLotAtTime,
  overlayRight = null,
  overlayTopLeft = null,
  overlayLines = null,
  mapRef,
  mapStyleMode = 'default', // 'default' | 'blank'
}) {
  const [popup, setPopup] = useState(null) // { id, lon, lat }
  const [hover, setHover] = useState(null) // { type, id?, meshId?, lon, lat, properties }
  const hasFitRef = useRef(false)
  const lastHoverKeyRef = useRef(null)

  const clearHover = useCallback(() => {
    lastHoverKeyRef.current = null
    setHover(null)
  }, [])

  const style = mapStyleMode === 'blank' ? BLANK_STYLE : DEMO_STYLE_URL

  const meshAtTime = useMemo(
    () => buildMeshAtTime(meshGeojson, selectedTimeIndex, getPeopleCount),
    [getPeopleCount, meshGeojson, selectedTimeIndex],
  )
  const parkingAtTime = useMemo(
    () => buildParkingAtTime(parkingLots, selectedTimeIndex, getLotAtTime),
    [getLotAtTime, parkingLots, selectedTimeIndex],
  )

  const parkingById = useMemo(() => {
    const byId = new Map()
    for (const f of parkingAtTime.features) byId.set(f.properties.id, f)
    return byId
  }, [parkingAtTime])

  const bbox = useMemo(() => computeBbox(meshGeojson), [meshGeojson])

  const handleLoad = useCallback(() => {
    const map = mapRef?.current?.getMap?.()
    if (!map || !bbox || hasFitRef.current) return
    hasFitRef.current = true
    map.fitBounds(
      [
        [bbox.minLon, bbox.minLat],
        [bbox.maxLon, bbox.maxLat],
      ],
      { padding: 48, duration: 0 },
    )
  }, [bbox, mapRef])

  const handleClick = useCallback(
    (evt) => {
      const feat = evt?.features?.[0]
      if (!feat || feat.layer?.id !== 'parking-circles') return
      const [lon, lat] = feat.geometry.coordinates
      clearHover()
      setPopup({ id: feat.properties.id, lon, lat })
    },
    [clearHover],
  )

  const handleMapClick = useCallback(
    (evt) => {
      handleClick(evt)
      if (!evt?.features?.length) setPopup(null)
    },
    [handleClick],
  )

  const handleMouseMove = useCallback((evt) => {
    const feat = evt?.features?.[0]
    if (!feat) {
      if (lastHoverKeyRef.current) {
        lastHoverKeyRef.current = null
        setHover(null)
      }
      return
    }

    const layerId = feat.layer?.id
    const lngLat = evt?.lngLat
    const lon = Array.isArray(lngLat) ? lngLat[0] : lngLat?.lng
    const lat = Array.isArray(lngLat) ? lngLat[1] : lngLat?.lat

    if (layerId === 'parking-circles') {
      const id = feat.properties?.id
      const key = id ? `p:${id}` : null
      if (key && lastHoverKeyRef.current === key) return
      lastHoverKeyRef.current = key
      const [pLon, pLat] = feat.geometry?.coordinates ?? [lon, lat]
      setHover({ type: 'parking', id, lon: pLon, lat: pLat, properties: feat.properties ?? {} })
      return
    }

    if (layerId === 'mesh-fill') {
      const meshId = feat.properties?.meshId
      const key = meshId ? `m:${meshId}` : null
      if (key && lastHoverKeyRef.current === key) return
      lastHoverKeyRef.current = key
      setHover({ type: 'mesh', meshId, lon, lat, properties: feat.properties ?? {} })
      return
    }

    if (lastHoverKeyRef.current) {
      lastHoverKeyRef.current = null
      setHover(null)
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    clearHover()
  }, [clearHover])

  const popupFeature = popup ? parkingById.get(popup.id) : null
  const hoverParkingId = hover?.type === 'parking' ? hover.id : null
  const hoverMeshId = hover?.type === 'mesh' ? hover.meshId : null
  const showHoverTooltip = Boolean(hover && !popupFeature)

  const initialViewState = useMemo(
    () => ({
      latitude: center[0],
      longitude: center[1],
      zoom: 14.6,
      bearing: 0,
      pitch: 0,
    }),
    [center],
  )

  return (
    <div className="relative h-full w-full" style={{ '--sim-transition': `${transitionMs}ms` }}>
      {/* local styles for maplibre popup chrome */}
      <style>{`
        .${popupClassName} .maplibregl-popup-tip{
          border-top-color: rgba(2,6,23,.75) !important;
          border-bottom-color: rgba(2,6,23,.75) !important;
        }
        .${popupClassName} .maplibregl-popup-close-button{
          color: rgba(255,255,255,.8);
          font-size: 18px;
          padding: 6px 8px;
          border-radius: 10px;
          margin: 6px;
        }
        .${popupClassName} .maplibregl-popup-close-button:hover{
          background: rgba(255,255,255,.08);
        }
        .${popupClassName} .maplibregl-popup-content{
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
      `}</style>

      <MapGL
        ref={mapRef}
        mapLib={maplibregl}
        mapStyle={style}
        initialViewState={initialViewState}
        onLoad={handleLoad}
        onClick={handleMapClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMoveStart={clearHover}
        interactiveLayerIds={['parking-circles', 'mesh-fill']}
        cursor={hover ? 'pointer' : 'grab'}
        preserveDrawingBuffer
      >
        {/* Make control match dark glass vibe */}
        <div className="absolute left-3 top-3 z-[2]">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <NavigationControl position="top-left" showCompass={false} />
          </div>
        </div>

        {/* Mesh polygons */}
        <Source id="mesh" type="geojson" data={meshAtTime}>
          <Layer
            id="mesh-fill"
            type="fill"
            paint={{
              'fill-color': meshColorExpression(),
              'fill-opacity': 0.72,
              'fill-color-transition': { duration: transitionMs, delay: 0 },
              'fill-opacity-transition': { duration: transitionMs, delay: 0 },
            }}
          />
          <Layer
            id="mesh-line"
            type="line"
            paint={{
              'line-color': 'rgba(255, 255, 255, 0.28)',
              'line-width': 1,
              'line-opacity': 0.9,
              'line-opacity-transition': { duration: transitionMs, delay: 0 },
            }}
          />
          {hoverMeshId ? (
            <Layer
              id="mesh-hover-outline"
              type="line"
              filter={['==', ['get', 'meshId'], hoverMeshId]}
              paint={{
                'line-color': 'rgba(255, 255, 255, 0.90)',
                'line-width': 3,
                'line-opacity': 0.95,
              }}
            />
          ) : null}
        </Source>

        {/* Flow overlays */}
        {overlayLines}

        {/* Parking circles */}
        <Source id="parking" type="geojson" data={parkingAtTime}>
          {/* soft glow underlay */}
          <Layer
            id="parking-glow"
            type="circle"
            paint={{
              'circle-color': occupancyColorExpression(),
              'circle-radius': ['+', PARKING_RADIUS_EXPR, 10],
              'circle-blur': 1.3,
              'circle-opacity': 0.25,
              'circle-opacity-transition': { duration: transitionMs, delay: 0 },
              'circle-color-transition': { duration: transitionMs, delay: 0 },
            }}
          />

          {/* main circles */}
          <Layer
            id="parking-circles"
            type="circle"
            paint={{
              'circle-color': occupancyColorExpression(),
              'circle-color-transition': { duration: transitionMs, delay: 0 },
              'circle-radius': PARKING_RADIUS_EXPR,
              'circle-stroke-color': 'rgba(255, 255, 255, 0.55)',
              'circle-stroke-width': 1.5,
              'circle-opacity': 0.98,
              'circle-opacity-transition': { duration: transitionMs, delay: 0 },
            }}
          />

          {hoverParkingId ? (
            <>
              <Layer
                id="parking-hover-halo"
                type="circle"
                filter={['==', ['get', 'id'], hoverParkingId]}
                paint={{
                  'circle-radius': ['+', PARKING_RADIUS_EXPR, 4],
                  'circle-color': 'rgba(255,255,255,0.0)',
                  'circle-stroke-color': 'rgba(255,255,255,0.92)',
                  'circle-stroke-width': 7,
                  'circle-opacity': 1,
                }}
              />
              <Layer
                id="parking-hover-ring"
                type="circle"
                filter={['==', ['get', 'id'], hoverParkingId]}
                paint={{
                  'circle-radius': ['+', PARKING_RADIUS_EXPR, 4],
                  'circle-color': 'rgba(255,255,255,0.0)',
                  'circle-stroke-color': 'rgba(2, 132, 199, 0.95)',
                  'circle-stroke-width': 2.5,
                  'circle-opacity': 1,
                }}
              />
            </>
          ) : null}

          {popup?.id ? (
            <>
              <Layer
                id="parking-selected-halo"
                type="circle"
                filter={['==', ['get', 'id'], popup.id]}
                paint={{
                  'circle-radius': ['+', PARKING_RADIUS_EXPR, 6],
                  'circle-color': 'rgba(255,255,255,0.0)',
                  'circle-stroke-color': 'rgba(255,255,255,0.95)',
                  'circle-stroke-width': 9,
                  'circle-opacity': 1,
                }}
              />
              <Layer
                id="parking-selected-ring"
                type="circle"
                filter={['==', ['get', 'id'], popup.id]}
                paint={{
                  'circle-radius': ['+', PARKING_RADIUS_EXPR, 6],
                  'circle-color': 'rgba(255,255,255,0.0)',
                  'circle-stroke-color': 'rgba(99, 102, 241, 0.95)',
                  'circle-stroke-width': 3,
                  'circle-opacity': 1,
                }}
              />
            </>
          ) : null}
        </Source>

        {/* Hover tooltip: Parking */}
        {showHoverTooltip && hover?.type === 'parking' ? (
          <Popup
            className={popupClassName}
            longitude={hover.lon}
            latitude={hover.lat}
            anchor="top"
            offset={14}
            closeButton={false}
            closeOnClick={false}
            maxWidth="340px"
          >
            {(() => {
              const occ = Number(hover.properties?.occupancyPercent ?? 0)
              const total = Number(hover.properties?.totalCapacity ?? 0)
              const available = Math.max(0, Math.round(total * (1 - occ / 100)))
              const pillColor = occupancyColor(occ)

              return (
                <PopupCard
                  title={hover.properties?.name}
                  subtitle="Parking lot (hover)"
                  pill={
                    <div
                      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                      style={{ backgroundColor: pillColor }}
                    >
                      {occ}% {occupancyLabel(occ)}
                    </div>
                  }
                >
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(0, Math.min(100, occ))}%`,
                          backgroundColor: pillColor,
                        }}
                      />
                    </div>

                    <div className="mt-3 grid gap-1.5">
                      <StatRow label="Available now" value={available} />
                      <StatRow label="Capacity" value={total} />
                      <StatRow label="Price" value={`${formatYen(Number(hover.properties?.price ?? 0))}/hr`} />
                    </div>
                  </div>
                </PopupCard>
              )
            })()}
          </Popup>
        ) : null}

        {/* Hover tooltip: Mesh */}
        {showHoverTooltip && hover?.type === 'mesh' ? (
          <Popup
            className={popupClassName}
            longitude={hover.lon}
            latitude={hover.lat}
            anchor="top"
            offset={10}
            closeButton={false}
            closeOnClick={false}
            maxWidth="300px"
          >
            {(() => {
              const people = Number(hover.properties?.peopleCount ?? 0)
              const color = meshFillColor(people)
              return (
                <PopupCard
                  title={`Mesh ${hover.properties?.meshId ?? ''}`}
                  subtitle="Estimated people in this cell"
                  pill={
                    <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white">
                      {people}
                    </div>
                  }
                >
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
                    <span
                      className="h-3 w-3 rounded-md shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
                      style={{ backgroundColor: color }}
                    />
                    <div className="text-[11px] text-white/70">
                      Higher counts indicate congestion risk.
                    </div>
                  </div>
                </PopupCard>
              )
            })()}
          </Popup>
        ) : null}

        {/* Click popup */}
        {popupFeature ? (
          <Popup
            className={popupClassName}
            longitude={popup.lon}
            latitude={popup.lat}
            anchor="bottom"
            onClose={() => setPopup(null)}
            closeButton
            closeOnClick={false}
            maxWidth="360px"
          >
            {(() => {
              const occ = Number(popupFeature.properties.occupancyPercent ?? 0)
              const total = Number(popupFeature.properties.totalCapacity ?? 0)
              const available = Math.max(0, Math.round(total * (1 - occ / 100)))
              const pillColor = occupancyColor(occ)

              return (
                <PopupCard
                  title={popupFeature.properties.name}
                  subtitle={`Selected • ${popupFeature.properties.time}`}
                  pill={
                    <div
                      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                      style={{ backgroundColor: pillColor }}
                    >
                      {occ}% {occupancyLabel(occ)}
                    </div>
                  }
                >
                  <div className="grid gap-2">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, occ))}%`,
                            backgroundColor: pillColor,
                          }}
                        />
                      </div>
                      <div className="mt-3 grid gap-1.5">
                        <StatRow label="Available now" value={available} />
                        <StatRow label="Capacity" value={total} />
                        <StatRow
                          label="Price"
                          value={`${formatYen(Number(popupFeature.properties.price ?? 0))}/hr`}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-gradient-to-r from-indigo-500/15 via-fuchsia-500/10 to-emerald-400/10 p-3">
                      <div className="text-[11px] font-semibold text-white">Dynamic pricing hint</div>
                      <div className="mt-1 text-[11px] text-white/70">
                        Prices rise as occupancy increases to shift demand to nearby lots.
                      </div>
                    </div>
                  </div>
                </PopupCard>
              )
            })()}
          </Popup>
        ) : null}
      </MapGL>

      {/* Overlays */}
      {timelineVisible ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-[500] w-full -translate-x-1/2 px-4">
          <div className="pointer-events-auto mx-auto flex justify-center">
            <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <TimelineSlider
                timeSlots={timeSlots}
                valueIndex={selectedTimeIndex}
                onChangeIndex={onChangeTimeIndex}
                series={timelineSeries}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-4 left-4 z-[500]">
        <div className="pointer-events-auto rounded-3xl border border-white/10 bg-slate-950/55 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <Legends />
        </div>
      </div>

      {overlayRight ? (
        <div className="pointer-events-none absolute right-4 top-4 z-[500]">
          <div className="pointer-events-auto rounded-3xl border border-white/10 bg-slate-950/55 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            {overlayRight}
          </div>
        </div>
      ) : null}

      {overlayTopLeft ? (
        <div className="pointer-events-none absolute left-4 top-4 z-[500]">
          <div className="pointer-events-auto rounded-3xl border border-white/10 bg-slate-950/55 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            {overlayTopLeft}
          </div>
        </div>
      ) : null}
    </div>
  )
}
