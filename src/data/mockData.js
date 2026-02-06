import { haversineDistanceMeters } from '../utils/geo.js'

export const OTARU_CANAL_CENTER = [43.1986, 141.0031] // [lat, lon] (approx)
export const OTARU_HOTSPOT = [43.1996, 141.0022]
const HOTSPOT = OTARU_HOTSPOT

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function buildTimeSlots({ startHour = 10, endHour = 18, stepMinutes = 15 } = {}) {
  const slots = []
  const start = startHour * 60
  const end = endHour * 60
  for (let m = start; m <= end; m += stepMinutes) {
    const hh = Math.floor(m / 60)
    const mm = m % 60
    slots.push(`${pad2(hh)}:${pad2(mm)}`)
  }
  return slots
}

export const TIME_SLOTS = buildTimeSlots()

export function timeToHour(timeStr) {
  const [hh, mm] = timeStr.split(':').map(Number)
  return hh + mm / 60
}

function hashStringToSeed(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return (h >>> 0) || 1
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussian(x, sigma) {
  return Math.exp(-(x * x) / (2 * sigma * sigma))
}

function cellDeltas({ atLat, cellSizeMeters }) {
  const metersPerDegLat = 111320
  const metersPerDegLon = 111320 * Math.cos((atLat * Math.PI) / 180)
  return {
    dLat: cellSizeMeters / metersPerDegLat,
    dLon: cellSizeMeters / metersPerDegLon,
  }
}

function generateMeshFeatures({ center, rows, cols, cellSizeMeters, timeSlots }) {
  const [cLat, cLon] = center
  const { dLat, dLon } = cellDeltas({ atLat: cLat, cellSizeMeters })
  const originLat = cLat - (rows / 2) * dLat
  const originLon = cLon - (cols / 2) * dLon

  const peakCenter = 13.25
  const peakWidthHrs = 1.75

  const features = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const minLat = originLat + r * dLat
      const minLon = originLon + c * dLon
      const maxLat = minLat + dLat
      const maxLon = minLon + dLon

      const centroid = [(minLat + maxLat) / 2, (minLon + maxLon) / 2]
      const distToHotspot = haversineDistanceMeters(centroid, HOTSPOT)
      const spatial = gaussian(distToHotspot / 550, 1) // ~0-1

      const meshId = `M-${r + 1}-${c + 1}`
      const timeSeries = timeSlots.map((t, idx) => {
        const hour = timeToHour(t)
        const timeFactor = gaussian((hour - peakCenter) / peakWidthHrs, 1)

        const seed = hashStringToSeed(`${meshId}:${idx}`)
        const rand = mulberry32(seed)
        const noise = (rand() - 0.5) * 16

        const baseline = 18 + 220 * timeFactor
        const peopleCount = Math.max(0, Math.round(baseline * (0.35 + 0.65 * spatial) + noise))
        return { time: t, peopleCount }
      })

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [minLon, minLat],
              [maxLon, minLat],
              [maxLon, maxLat],
              [minLon, maxLat],
              [minLon, minLat],
            ],
          ],
        },
        properties: { meshId, row: r, col: c, centroid, timeSeries },
      })
    }
  }
  return features
}

function generateParkingLots({ timeSlots }) {
  const lots = [
    { id: 'P-01', name: 'Canal East Lot', lat: 43.1992, lon: 141.0051, totalCapacity: 120 },
    { id: 'P-02', name: 'Canal West Lot', lat: 43.1989, lon: 141.0010, totalCapacity: 90 },
    { id: 'P-03', name: 'Sakaimachi Street Lot', lat: 43.2003, lon: 141.0037, totalCapacity: 70 },
    { id: 'P-04', name: 'Otaru Port Side Lot', lat: 43.1967, lon: 141.0072, totalCapacity: 160 },
    { id: 'P-05', name: 'Ironai 1-chome Lot', lat: 43.1979, lon: 141.0009, totalCapacity: 65 },
    { id: 'P-06', name: 'Temiya Green Lot', lat: 43.2020, lon: 141.0022, totalCapacity: 110 },
    { id: 'P-07', name: 'Station Connector Lot', lat: 43.1971, lon: 141.0084, totalCapacity: 140 },
    { id: 'P-08', name: 'Warehouse District Lot', lat: 43.2010, lon: 141.0069, totalCapacity: 80 },
    { id: 'P-09', name: 'North Ridge Lot', lat: 43.2033, lon: 141.0046, totalCapacity: 60 },
  ]

  const peakCenter = 13.25
  const peakWidthHrs = 1.9

  return lots.map((lot) => {
    const dist = haversineDistanceMeters([lot.lat, lot.lon], HOTSPOT)
    const proximity = gaussian(dist / 620, 1)

    const timeSeries = timeSlots.map((t, idx) => {
      const hour = timeToHour(t)
      const timeFactor = gaussian((hour - peakCenter) / peakWidthHrs, 1)

      const seed = hashStringToSeed(`${lot.id}:${idx}`)
      const rand = mulberry32(seed)
      const noise = (rand() - 0.5) * 10

      const occupancyPercent = Math.round(
        Math.min(98, Math.max(6, 26 + 62 * timeFactor * (0.55 + 0.45 * proximity) + noise)),
      )

      const basePrice = 220 + 260 * (0.35 + 0.65 * proximity) + 190 * timeFactor
      const price = Math.round((basePrice + (rand() - 0.5) * 30) / 10) * 10

      return { time: t, occupancyPercent, price }
    })

    return { ...lot, timeSeries }
  })
}

export const BASE_MESH_GEOJSON = {
  type: 'FeatureCollection',
  features: generateMeshFeatures({
    center: OTARU_CANAL_CENTER,
    rows: 7,
    cols: 7,
    cellSizeMeters: 250,
    timeSlots: TIME_SLOTS,
  }),
}

export const BASE_PARKING_LOTS = generateParkingLots({ timeSlots: TIME_SLOTS })
