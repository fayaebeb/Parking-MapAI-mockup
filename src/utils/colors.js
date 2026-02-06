export const MESH_LEGEND_STOPS = [
  { max: 40, label: '0–40', color: '#dcfce7' }, // green-100
  { max: 80, label: '41–80', color: '#bbf7d0' }, // green-200
  { max: 120, label: '81–120', color: '#fef9c3' }, // yellow-100
  { max: 160, label: '121–160', color: '#fde68a' }, // amber-200
  { max: 200, label: '161–200', color: '#fb7185' }, // rose-400
  { max: Infinity, label: '200+', color: '#be123c' }, // rose-700
]

export function meshFillColor(peopleCount) {
  const stop = MESH_LEGEND_STOPS.find((s) => peopleCount <= s.max) ?? MESH_LEGEND_STOPS.at(-1)
  return stop.color
}

export function occupancyColor(occupancyPercent) {
  if (occupancyPercent >= 75) return '#ef4444' // red-500
  if (occupancyPercent >= 45) return '#f59e0b' // amber-500
  return '#22c55e' // green-500
}

export function occupancyLabel(occupancyPercent) {
  if (occupancyPercent >= 75) return 'High'
  if (occupancyPercent >= 45) return 'Medium'
  return 'Low'
}

export function formatYen(value) {
  try {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(
      value,
    )
  } catch {
    return `${Math.round(value)} JPY`
  }
}

