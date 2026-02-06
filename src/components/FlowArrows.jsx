import { Fragment } from 'react'
import { Polyline } from 'react-leaflet'
import { buildArrowSegments } from '../utils/flow.js'

export default function FlowArrows({ arrows = [] }) {
  return (
    <>
      {arrows.map((a) => {
        const seg = buildArrowSegments(a.from, a.to, a.options)
        const color = a.color ?? 'rgba(2, 132, 199, 0.9)'
        const weight = a.weight ?? 2.5
        const opacity = a.opacity ?? 0.9
        const dashArray = a.dashArray ?? '6 8'
        return (
          <Fragment key={a.id}>
            <Polyline pathOptions={{ className: 'flow-line', color, weight, opacity, dashArray }} positions={seg.main} />
            <Polyline pathOptions={{ className: 'flow-line', color, weight, opacity }} positions={seg.headLeft} />
            <Polyline pathOptions={{ className: 'flow-line', color, weight, opacity }} positions={seg.headRight} />
          </Fragment>
        )
      })}
    </>
  )
}
