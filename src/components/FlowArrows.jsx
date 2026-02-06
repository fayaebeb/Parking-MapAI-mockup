import { useMemo } from 'react'
import { Layer, Source } from 'react-map-gl/maplibre'
import { buildArrowSegments } from '../utils/flow.js'

function toLonLat([lat, lon]) {
  return [lon, lat]
}

export default function FlowArrows({ arrows = [], transitionMs = 250 }) {
  const data = useMemo(() => {
    const features = []

    for (const a of arrows) {
      const seg = buildArrowSegments(a.from, a.to, a.options)
      const color = a.color ?? 'rgba(2, 132, 199, 0.9)'
      const weight = a.weight ?? 2.5
      const opacity = a.opacity ?? 0.9

      const pushLine = (coordsLatLon, role) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coordsLatLon.map(toLonLat) },
          properties: { id: a.id, role, color, weight, opacity },
        })
      }

      pushLine(seg.main, 'main')
      pushLine(seg.headLeft, 'head')
      pushLine(seg.headRight, 'head')
    }

    return { type: 'FeatureCollection', features }
  }, [arrows])

  if (!arrows.length) return null

  return (
    <Source id="flow-arrows" type="geojson" data={data}>
      <Layer
        id="flow-arrows-main"
        type="line"
        filter={['==', ['get', 'role'], 'main']}
        paint={{
          'line-color': ['get', 'color'],
          'line-opacity': ['get', 'opacity'],
          'line-width': ['get', 'weight'],
          'line-dasharray': [2, 2.5],
          'line-opacity-transition': { duration: transitionMs, delay: 0 },
        }}
      />
      <Layer
        id="flow-arrows-head"
        type="line"
        filter={['==', ['get', 'role'], 'head']}
        paint={{
          'line-color': ['get', 'color'],
          'line-opacity': ['get', 'opacity'],
          'line-width': ['get', 'weight'],
          'line-opacity-transition': { duration: transitionMs, delay: 0 },
        }}
      />
    </Source>
  )
}
