import { OTARU_HOTSPOT, timeToHour } from '../data/mockData.js'
import { clamp, haversineDistanceMeters } from './geo.js'

export const CASES = {
  peak: {
    id: 'peak',
    name: 'Case 1: Peak Hours Pricing',
    subtitle: 'Midday higher price, morning lower price.',
    bullets: [
      '12:00–15:00 price multiplier +35% (peak).',
      '10:00–11:00 price multiplier −15% (off‑peak).',
      'Higher price slightly reduces occupancy; lower price slightly increases occupancy.',
      'Expected: reduced hotspot intensity and slightly smoother parking utilization.',
    ],
    transitionMs: 350,
  },
  demand: {
    id: 'demand',
    name: 'Case 2: Demand-Based Pricing',
    subtitle: 'Price responds to occupancy at each 15‑minute step.',
    bullets: [
      'If occupancy ≥ 85%, price +30% (strong signal).',
      'If occupancy ≥ 70%, price +18% (mild signal).',
      'If occupancy ≤ 30%, price −20% (discount).',
      'Animated updates over ~1 second.',
      'Expected: high-demand lots cool down; low-demand lots attract overflow.',
    ],
    transitionMs: 1000,
  },
  area: {
    id: 'area',
    name: 'Case 3: Area-Based Redistribution',
    subtitle: 'Hotspot-adjacent lots price up; surrounding area prices down.',
    bullets: [
      'Lots within ~420m of hotspot: price +40%.',
      'Lots in 420–900m ring: price −15%.',
      'Mesh congestion reduced at hotspot, increased slightly in surrounding ring.',
      'Expected: visitors spread outward, lowering the peak near the canal.',
    ],
    transitionMs: 450,
  },
}

function gaussianLike(x) {
  return Math.exp(-(x * x) / 2)
}

function roundTo10(n) {
  return Math.round(n / 10) * 10
}

export function findHotspot(meshGeojson, timeIndex) {
  let best = null
  let bestCount = -Infinity

  for (const f of meshGeojson.features) {
    const count = f?.properties?.timeSeries?.[timeIndex]?.peopleCount ?? 0
    if (count > bestCount) {
      best = f
      bestCount = count
    }
  }

  return {
    feature: best,
    peopleCount: bestCount,
    center: best?.properties?.centroid ?? null, // [lat, lon]
    meshId: best?.properties?.meshId ?? null,
  }
}

export function buildScenarioContext({ caseId, meshGeojson, timeIndex }) {
  if (caseId !== 'area') return { caseId }
  const hotspot = findHotspot(meshGeojson, timeIndex)
  return { caseId, hotspot }
}

export function effectiveMeshPeopleCount({ feature, timeIndex, caseId, context }) {
  const base = feature?.properties?.timeSeries?.[timeIndex]?.peopleCount ?? 0
  if (!caseId) return base

  const centroid = feature?.properties?.centroid
  const timeLabel = feature?.properties?.timeSeries?.[timeIndex]?.time ?? '13:00'
  const hour = timeToHour(timeLabel)

  if (caseId === 'peak') {
    const dist = centroid ? haversineDistanceMeters(centroid, OTARU_HOTSPOT) : 0
    const spatial = gaussianLike(dist / 520) // 0-1
    const timeFactor = gaussianLike((hour - 13.25) / 1.7)
    const multiplier = 1 - 0.14 * spatial * timeFactor + 0.06 * (1 - spatial) * timeFactor
    return Math.max(0, Math.round(base * multiplier))
  }

  if (caseId === 'demand') {
    const pressure = clamp(base / 240, 0, 1)
    const multiplier = 1 - 0.07 * pressure + 0.02 * (1 - pressure)
    return Math.max(0, Math.round(base * multiplier))
  }

  if (caseId === 'area') {
    const hotspotCenter = context?.hotspot?.center
    const dist = centroid && hotspotCenter ? haversineDistanceMeters(centroid, hotspotCenter) : Infinity
    let multiplier = 1
    if (dist <= 280) multiplier = 0.82
    else if (dist <= 720) multiplier = 1.08
    else if (dist <= 1100) multiplier = 1.03
    return Math.max(0, Math.round(base * multiplier))
  }

  return base
}

function peakHourPriceMultiplier(hour) {
  if (hour >= 12 && hour <= 15) return 1.35
  if (hour >= 10 && hour <= 11) return 0.85
  return 1.0
}

function occupancyDeltaFromMultiplier(multiplier) {
  if (multiplier > 1) return -Math.round((multiplier - 1) * 22)
  if (multiplier < 1) return Math.round((1 - multiplier) * 14)
  return 0
}

export function effectiveParkingAtTime({ lot, timeIndex, caseId, context }) {
  const base = lot?.timeSeries?.[timeIndex] ?? { time: '--:--', occupancyPercent: 0, price: 0 }
  if (!caseId) return base

  const hour = timeToHour(base.time)
  const lotPos = [lot.lat, lot.lon]

  if (caseId === 'peak') {
    const multiplier = peakHourPriceMultiplier(hour)
    const dist = haversineDistanceMeters(lotPos, OTARU_HOTSPOT)
    const proximity = gaussianLike(dist / 650)
    const occDelta = Math.round(occupancyDeltaFromMultiplier(multiplier) * (0.75 + 0.25 * proximity))

    return {
      ...base,
      price: Math.max(100, roundTo10(base.price * multiplier)),
      occupancyPercent: clamp(base.occupancyPercent + occDelta, 0, 100),
    }
  }

  if (caseId === 'demand') {
    const occ = base.occupancyPercent
    let delta = 0
    if (occ >= 85) delta = 0.3
    else if (occ >= 70) delta = 0.18
    else if (occ <= 30) delta = -0.2
    else if (occ <= 45) delta = -0.1

    const multiplier = 1 + delta
    const occDelta = -Math.round(delta * 20)

    return {
      ...base,
      price: Math.max(100, roundTo10(base.price * multiplier)),
      occupancyPercent: clamp(base.occupancyPercent + occDelta, 0, 100),
    }
  }

  if (caseId === 'area') {
    const hotspotCenter = context?.hotspot?.center
    const dist = hotspotCenter ? haversineDistanceMeters(lotPos, hotspotCenter) : Infinity
    let multiplier = 1
    if (dist <= 420) multiplier = 1.4
    else if (dist <= 900) multiplier = 0.85

    let occDelta = occupancyDeltaFromMultiplier(multiplier)
    // Make redistribution visually obvious in the mock (colors shift).
    if (dist <= 420) occDelta -= 4
    else if (dist <= 900) occDelta += 4

    return {
      ...base,
      price: Math.max(100, roundTo10(base.price * multiplier)),
      occupancyPercent: clamp(base.occupancyPercent + occDelta, 0, 100),
    }
  }

  return base
}

function offsetLatLon([lat, lon], dNorthMeters, dEastMeters) {
  const metersPerDegLat = 111320
  const metersPerDegLon = 111320 * Math.cos((lat * Math.PI) / 180)
  return [lat + dNorthMeters / metersPerDegLat, lon + dEastMeters / metersPerDegLon]
}

export function scenarioArrows({ caseId, context }) {
  if (caseId !== 'area') return []
  const from = context?.hotspot?.center
  if (!from) return []

  // Outward redistribution vectors (mock).
  const targets = [
    offsetLatLon(from, 620, 0),
    offsetLatLon(from, 0, 720),
    offsetLatLon(from, -620, 0),
    offsetLatLon(from, 0, -720),
  ]

  return targets.map((to, i) => ({
    id: `area-flow-${i}`,
    from,
    to,
    color: 'rgba(2, 132, 199, 0.9)',
    weight: 2.5,
    opacity: 0.9,
    dashArray: '6 10',
    options: { headLengthMeters: 80 },
  }))
}
