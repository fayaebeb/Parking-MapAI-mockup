import { useCallback, useMemo, useRef, useState } from 'react'
import MapGL, { Layer, NavigationControl, Popup, Source } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import Legends from './Legends.jsx'
import TimelineSlider from './TimelineSlider.jsx'
import { formatYen, occupancyLabel } from '../utils/colors.js'

const DEMO_STYLE_URL = 'https://api.maptiler.com/maps/streets-v4/style.json?key=uabdCkQNz8KjbO5DdjMb'

const BLANK_STYLE = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e2e8f0' } }],
}

function computeBbox(geojson) {
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity

  for (const f of geojson?.features ?? []) {
    const geom = f?.geometry
    if (!geom) continue

    // Only polygons/lines/points used in this app.
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
  // 0–40, 41–80, 81–120, 121–160, 161–200, 200+
  return [
    'step',
    ['get', 'peopleCount'],
    '#dcfce7',
    41,
    '#bbf7d0',
    81,
    '#fef9c3',
    121,
    '#fde68a',
    161,
    '#fb7185',
    201,
    '#be123c',
  ]
}

function occupancyColorExpression() {
  return ['step', ['get', 'occupancyPercent'], '#22c55e', 45, '#f59e0b', 75, '#ef4444']
}

function toLonLat([lat, lon]) {
  return [lon, lat]
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

export default function MapView({
  center,
  meshGeojson,
  parkingLots,
  timeSlots,
  selectedTimeIndex,
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
  const hasFitRef = useRef(false)

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

  const handleClick = useCallback((evt) => {
    const feat = evt?.features?.[0]
    if (!feat || feat.layer?.id !== 'parking-circles') return
    const [lon, lat] = feat.geometry.coordinates
    setPopup({ id: feat.properties.id, lon, lat })
  }, [])

  const handleMapClick = useCallback(
    (evt) => {
      handleClick(evt)
      if (!evt?.features?.length) setPopup(null)
    },
    [handleClick],
  )

  const popupFeature = popup ? parkingById.get(popup.id) : null

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
      <MapGL
        ref={mapRef}
        mapLib={maplibregl}
        mapStyle={style}
        initialViewState={initialViewState}
        onLoad={handleLoad}
        onClick={handleMapClick}
        interactiveLayerIds={['parking-circles']}
        preserveDrawingBuffer
      >
        <NavigationControl position="top-left" showCompass={false} />

        {/* Mesh polygons */}
        <Source id="mesh" type="geojson" data={meshAtTime}>
          <Layer
            id="mesh-fill"
            type="fill"
            paint={{
              'fill-color': meshColorExpression(),
              'fill-opacity': 0.65,
              'fill-color-transition': { duration: transitionMs, delay: 0 },
              'fill-opacity-transition': { duration: transitionMs, delay: 0 },
            }}
          />
          <Layer
            id="mesh-line"
            type="line"
            paint={{
              'line-color': 'rgba(15, 23, 42, 0.45)',
              'line-width': 1,
              'line-opacity': 0.8,
              'line-opacity-transition': { duration: transitionMs, delay: 0 },
            }}
          />
        </Source>

        {/* Flow overlays */}
        {overlayLines}

        {/* Parking circles (rendered ABOVE mesh) */}
        <Source id="parking" type="geojson" data={parkingAtTime}>
          <Layer
            id="parking-circles"
            type="circle"
            paint={{
              'circle-color': occupancyColorExpression(),
              'circle-color-transition': { duration: transitionMs, delay: 0 },
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['get', 'totalCapacity'],
                50,
                7,
                160,
                11,
              ],
              'circle-stroke-color': 'rgba(15, 23, 42, 0.7)',
              'circle-stroke-width': 1.5,
              'circle-opacity': 0.96,
              'circle-opacity-transition': { duration: transitionMs, delay: 0 },
            }}
          />
        </Source>

        {popupFeature ? (
          <Popup
            longitude={popup.lon}
            latitude={popup.lat}
            anchor="bottom"
            onClose={() => setPopup(null)}
            closeButton
            closeOnClick={false}
            maxWidth="320px"
          >
            <div className="min-w-[220px]">
              <div className="text-sm font-semibold text-slate-900">{popupFeature.properties.name}</div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
                <div className="text-slate-500">Time</div>
                <div className="font-medium text-slate-900">{popupFeature.properties.time}</div>
                <div className="text-slate-500">Occupancy</div>
                <div className="font-medium text-slate-900">
                  {popupFeature.properties.occupancyPercent}%{' '}
                  <span className="text-slate-500">({occupancyLabel(popupFeature.properties.occupancyPercent)})</span>
                </div>
                <div className="text-slate-500">Capacity</div>
                <div className="font-medium text-slate-900">{popupFeature.properties.totalCapacity}</div>
                <div className="text-slate-500">Price</div>
                <div className="font-medium text-slate-900">{formatYen(popupFeature.properties.price)}/hr</div>
              </div>
            </div>
          </Popup>
        ) : null}
      </MapGL>

      {/* Overlays */}
      {timelineVisible ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-[500] w-full -translate-x-1/2 px-4">
          <div className="pointer-events-auto mx-auto flex justify-center">
            <TimelineSlider timeSlots={timeSlots} valueIndex={selectedTimeIndex} onChangeIndex={onChangeTimeIndex} />
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-4 left-4 z-[500]">
        <div className="pointer-events-auto">
          <Legends />
        </div>
      </div>

      {overlayRight ? (
        <div className="pointer-events-none absolute right-4 top-4 z-[500]">
          <div className="pointer-events-auto">{overlayRight}</div>
        </div>
      ) : null}

      {overlayTopLeft ? (
        <div className="pointer-events-none absolute left-4 top-4 z-[500]">
          <div className="pointer-events-auto">{overlayTopLeft}</div>
        </div>
      ) : null}
    </div>
  )
}
