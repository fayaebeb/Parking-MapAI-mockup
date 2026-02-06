import { OTARU_HOTSPOT, timeToHour } from '../data/mockData.js'
import { clamp, haversineDistanceMeters } from './geo.js'

/**
 * UI copy + animation timing used across the app.
 * (Wording tweaked to feel more “product-y” and premium.)
 */
export const CASES = {
  peak: {
    id: 'peak',
    name: 'Case 1: Peak-Hour Pricing',
    subtitle: 'Midday surge pricing, off-peak incentives.',
    bullets: [
      '12:00–15:00: +35% price multiplier (peak window).',
      '10:00–11:00: −15% price multiplier (off-peak).',
      'Higher price gently reduces occupancy; lower price gently increases occupancy.',
      'Expected: reduced hotspot pressure and smoother utilization across lots.',
    ],
    transitionMs: 350,
  },
  demand: {
    id: 'demand',
    name: 'Case 2: Real-Time Demand Pricing',
    subtitle: 'Prices react to occupancy every 15 minutes.',
    bullets: [
      'Occupancy ≥ 85%: +30% price (strong signal).',
      'Occupancy ≥ 70%: +18% price (soft signal).',
      'Occupancy ≤ 30%: −20% price (discount).',
      'Smooth animated updates (~1s) for clarity.',
      'Expected: high-demand lots cool down; nearby lots pull overflow.',
    ],
    transitionMs: 1000,
  },
  area: {
    id: 'area',
    name: 'Case 3: Area-Based Redistribution',
    subtitle: 'Shift demand outward from the canal hotspot.',
    bullets: [
      'Lots within ~420m of hotspot: +40% price.',
      'Lots in 420–900m ring: −15% price.',
      'Mesh congestion decreases at hotspot; slightly increases in the surrounding ring.',
      'Expected: visitors disperse outward, lowering the peak near the canal.',
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

/**
 * Find the busiest mesh cell at a given timeIndex.
 */
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

/**
 * Context computed once per case/time (currently only area needs hotspot).
 */
export function buildScenarioContext({ caseId, meshGeojson, timeIndex }) {
  if (caseId !== 'area') return { caseId }
  const hotspot = findHotspot(meshGeojson, timeIndex)
  return { caseId, hotspot }
}

/**
 * Effective peopleCount for mesh cell after applying scenario.
 */
export function effectiveMeshPeopleCount({ feature, timeIndex, caseId, context }) {
  const base = feature?.properties?.timeSeries?.[timeIndex]?.peopleCount ?? 0
  if (!caseId) return base

  const centroid = feature?.properties?.centroid
  const timeLabel = feature?.properties?.timeSeries?.[timeIndex]?.time ?? '13:00'
  const hour = timeToHour(timeLabel)

  // Case 1: Peak pricing reduces hotspot intensity during peak hours.
  if (caseId === 'peak') {
    const dist = centroid ? haversineDistanceMeters(centroid, OTARU_HOTSPOT) : 0
    const spatial = gaussianLike(dist / 520) // 0..1 (closer => higher)
    const timeFactor = gaussianLike((hour - 13.25) / 1.7)
    const multiplier = 1 - 0.14 * spatial * timeFactor + 0.06 * (1 - spatial) * timeFactor
    return Math.max(0, Math.round(base * multiplier))
  }

  // Case 2: Demand pricing slightly reduces high pressure cells overall.
  if (caseId === 'demand') {
    const pressure = clamp(base / 240, 0, 1)
    const multiplier = 1 - 0.07 * pressure + 0.02 * (1 - pressure)
    return Math.max(0, Math.round(base * multiplier))
  }

  // Case 3: Area redistribution—pull down hotspot, push into ring.
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

/**
 * Convert a price multiplier into a (small) occupancy shift.
 * (Purely for mock coherence + visual feedback.)
 */
function occupancyDeltaFromMultiplier(multiplier) {
  if (multiplier > 1) return -Math.round((multiplier - 1) * 22)
  if (multiplier < 1) return Math.round((1 - multiplier) * 14)
  return 0
}

/**
 * Effective occupancy + price for a lot at a timeIndex after applying scenario.
 */
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
    // Make redistribution visually obvious (colors shift).
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

/**
 * Flow arrows shown on the map (currently only for area redistribution).
 * Note: dashArray is passed through options in buildArrowSegments; keep here for clarity.
 */
export function scenarioArrows({ caseId, context }) {
  if (caseId !== 'area') return []
  const from = context?.hotspot?.center
  if (!from) return []

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
    color: 'rgba(99, 102, 241, 0.95)', // indigo vibe
    weight: 2.6,
    opacity: 0.9,
    dashArray: '6 10',
    options: { headLengthMeters: 80 },
  }))
}
