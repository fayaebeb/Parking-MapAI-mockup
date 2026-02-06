import { toRad } from './geo.js'

function rotate(vec, angleRad) {
  const [x, y] = vec
  const c = Math.cos(angleRad)
  const s = Math.sin(angleRad)
  return [x * c - y * s, x * s + y * c]
}

function projectLatLonToXYMeters([lat, lon], refLat) {
  const metersPerDegLat = 111320
  const metersPerDegLon = 111320 * Math.cos(toRad(refLat))
  return [lon * metersPerDegLon, lat * metersPerDegLat]
}

function unprojectXYMetersToLatLon([x, y], refLat) {
  const metersPerDegLat = 111320
  const metersPerDegLon = 111320 * Math.cos(toRad(refLat))
  return [y / metersPerDegLat, x / metersPerDegLon]
}

export function buildArrowSegments(startLatLon, endLatLon, { headLengthMeters = 70, headAngleRad = Math.PI / 7 } = {}) {
  const refLat = (startLatLon[0] + endLatLon[0]) / 2
  const [x1, y1] = projectLatLonToXYMeters(startLatLon, refLat)
  const [x2, y2] = projectLatLonToXYMeters(endLatLon, refLat)

  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len

  const head = Math.min(headLengthMeters, len * 0.35)
  const baseVec = [-ux * head, -uy * head]
  const left = rotate(baseVec, headAngleRad)
  const right = rotate(baseVec, -headAngleRad)

  const leftPt = unprojectXYMetersToLatLon([x2 + left[0], y2 + left[1]], refLat)
  const rightPt = unprojectXYMetersToLatLon([x2 + right[0], y2 + right[1]], refLat)

  return {
    main: [startLatLon, endLatLon],
    headLeft: [endLatLon, leftPt],
    headRight: [endLatLon, rightPt],
  }
}

