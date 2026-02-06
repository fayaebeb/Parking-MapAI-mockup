import { useEffect, useMemo, useRef, useState } from 'react'
import { Layer, Source } from 'react-map-gl/maplibre'
import { buildArrowSegments } from '../utils/flow.js'

function toLonLat([lat, lon]) {
  return [lon, lat]
}

const ARROW_LAYOUT = { 'line-cap': 'round', 'line-join': 'round' }

function parseDashArray(d) {
  // accepts "6 10" or [6,10]
  if (Array.isArray(d)) return d
  if (typeof d !== 'string') return null
  const nums = d
    .trim()
    .split(/[,\s]+/)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0)
  return nums.length >= 2 ? nums.slice(0, 2) : null
}

export default function FlowArrows({ arrows = [], transitionMs = 250, animate = true }) {
  const [phase, setPhase] = useState(0)
  const rafRef = useRef(null)

  // animate “dash phase” (cheap + looks good)
  useEffect(() => {
    if (!animate || !arrows.length) return
    let last = performance.now()

    const tick = (t) => {
      // ~10–12 fps is enough for dash illusion, and cheap
      if (t - last > 90) {
        last = t
        setPhase((p) => (p + 1) % 4)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [animate, arrows.length])

  const data = useMemo(() => {
    const features = []

    for (const a of arrows) {
      const seg = buildArrowSegments(a.from, a.to, a.options)
      const color = a.color ?? 'rgba(99, 102, 241, 0.95)'
      const weight = a.weight ?? 2.6
      const opacity = a.opacity ?? 0.9
      const dash = parseDashArray(a.dashArray) // <- NEW

      const pushLine = (coordsLatLon, role) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coordsLatLon.map(toLonLat) },
          properties: { id: a.id, role, color, weight, opacity, dash0: dash?.[0], dash1: dash?.[1] },
        })
      }

      pushLine(seg.main, 'main')
      pushLine(seg.headLeft, 'head')
      pushLine(seg.headRight, 'head')
    }

    return { type: 'FeatureCollection', features }
  }, [arrows])

  if (!arrows.length) return null

  // dash animation frames (illusion of motion)
  // we “shift” the pattern by swapping lengths—simple but surprisingly effective visually.
  const dashFrames = [
    [2.2, 3.0],
    [3.0, 2.2],
    [1.4, 3.8],
    [3.8, 1.4],
  ]

  return (
    <Source id="flow-arrows" type="geojson" data={data}>
      {/* big soft glow under everything */}
      <Layer
        id="flow-glow"
        type="line"
        layout={ARROW_LAYOUT}
        paint={{
          'line-color': ['get', 'color'],
          'line-opacity': ['*', ['get', 'opacity'], 0.20],
          'line-width': ['+', ['get', 'weight'], 12],
          'line-blur': 1.6,
          'line-opacity-transition': { duration: transitionMs, delay: 0 },
        }}
      />

      {/* base casing (dashed) */}
      <Layer
        id="flow-main-casing"
        type="line"
        filter={['==', ['get', 'role'], 'main']}
        layout={ARROW_LAYOUT}
        paint={{
          'line-color': 'rgba(255,255,255,0.92)',
          'line-opacity': ['*', ['get', 'opacity'], 0.55],
          'line-width': ['+', ['get', 'weight'], 3.6],
          'line-dasharray': [
            'case',
            ['all', ['has', 'dash0'], ['has', 'dash1']],
            ['literal', [6, 10]],
            ['literal', [2.2, 3.0]],
          ],
          'line-opacity-transition': { duration: transitionMs, delay: 0 },
        }}
      />

      {/* base colored main (dashed) */}
      <Layer
        id="flow-main"
        type="line"
        filter={['==', ['get', 'role'], 'main']}
        layout={ARROW_LAYOUT}
        paint={{
          'line-color': ['get', 'color'],
          'line-opacity': ['get', 'opacity'],
          'line-width': ['get', 'weight'],
          'line-dasharray': [
            'case',
            ['all', ['has', 'dash0'], ['has', 'dash1']],
            ['literal', [6, 10]],
            ['literal', [2.2, 3.0]],
          ],
          'line-opacity-transition': { duration: transitionMs, delay: 0 },
        }}
      />

      {/* ✨ animated highlight pulse on top (also dashed) */}
      <Layer
        id="flow-main-pulse"
        type="line"
        filter={['==', ['get', 'role'], 'main']}
        layout={ARROW_LAYOUT}
        paint={{
          'line-color': 'rgba(255,255,255,0.95)',
          'line-opacity': ['*', ['get', 'opacity'], 0.22],
          'line-width': ['+', ['get', 'weight'], 2.0],
          'line-dasharray': ['literal', dashFrames[phase]],
          'line-blur': 0.2,
          'line-opacity-transition': { duration: transitionMs, delay: 0 },
        }}
      />

      {/* heads: casing */}
      <Layer
        id="flow-head-casing"
        type="line"
        filter={['==', ['get', 'role'], 'head']}
        layout={ARROW_LAYOUT}
        paint={{
          'line-color': 'rgba(255,255,255,0.92)',
          'line-opacity': ['*', ['get', 'opacity'], 0.7],
          'line-width': ['+', ['get', 'weight'], 3.8],
          'line-opacity-transition': { duration: transitionMs, delay: 0 },
        }}
      />

      {/* heads: colored */}
      <Layer
        id="flow-head"
        type="line"
        filter={['==', ['get', 'role'], 'head']}
        layout={ARROW_LAYOUT}
        paint={{
          'line-color': ['get', 'color'],
          'line-opacity': ['get', 'opacity'],
          'line-width': ['+', ['get', 'weight'], 0.4],
          'line-opacity-transition': { duration: transitionMs, delay: 0 },
        }}
      />
    </Source>
  )
}
