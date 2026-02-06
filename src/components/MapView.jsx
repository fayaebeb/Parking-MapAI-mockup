import clsx from 'clsx'
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer } from 'react-leaflet'
import Legends from './Legends.jsx'
import TimelineSlider from './TimelineSlider.jsx'
import { formatYen, meshFillColor, occupancyColor, occupancyLabel } from '../utils/colors.js'

function defaultGetPeopleCount(feature, timeIndex) {
  return feature?.properties?.timeSeries?.[timeIndex]?.peopleCount ?? 0
}

function defaultGetLotAtTime(lot, timeIndex) {
  return lot?.timeSeries?.[timeIndex] ?? { occupancyPercent: 0, price: 0, time: '--:--' }
}

export default function MapView({
  center,
  meshGeojson,
  parkingLots,
  timeSlots,
  selectedTimeIndex,
  styleKey = 'base',
  timelineVisible,
  onChangeTimeIndex,
  transitionMs = 250,
  getPeopleCount = defaultGetPeopleCount,
  getLotAtTime = defaultGetLotAtTime,
  captureRef = null,
  hideTiles = false,
  overlayRight = null,
  overlayTopLeft = null,
  overlayLines = null,
}) {
  return (
    <div
      ref={captureRef}
      className={clsx('relative h-full w-full', hideTiles && 'hide-tiles')}
      style={{ '--sim-transition': `${transitionMs}ms` }}
    >
      <MapContainer center={center} zoom={15} scrollWheelZoom className="h-full w-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
          crossOrigin=""
        />

        <GeoJSON
          key={`mesh-${styleKey}-${selectedTimeIndex}`}
          data={meshGeojson}
          style={(feature) => {
            const count = getPeopleCount(feature, selectedTimeIndex)
            return {
              className: 'mesh-cell',
              fillColor: meshFillColor(count),
              color: 'rgba(15, 23, 42, 0.35)',
              weight: 1,
              fillOpacity: 0.65,
            }
          }}
        />

        {parkingLots.map((lot) => {
          const atTime = getLotAtTime(lot, selectedTimeIndex)
          const fill = occupancyColor(atTime.occupancyPercent)
          return (
            <CircleMarker
              key={lot.id}
              center={[lot.lat, lot.lon]}
              radius={10}
              pathOptions={{
                className: 'parking-dot',
                color: 'rgba(15, 23, 42, 0.65)',
                weight: 1.5,
                fillColor: fill,
                fillOpacity: 0.95,
              }}
            >
              <Popup>
                <div className="min-w-[220px]">
                  <div className="text-sm font-semibold text-slate-900">{lot.name}</div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
                    <div className="text-slate-500">Time</div>
                    <div className="font-medium text-slate-900">{atTime.time}</div>
                    <div className="text-slate-500">Occupancy</div>
                    <div className="font-medium text-slate-900">
                      {atTime.occupancyPercent}% <span className="text-slate-500">({occupancyLabel(atTime.occupancyPercent)})</span>
                    </div>
                    <div className="text-slate-500">Capacity</div>
                    <div className="font-medium text-slate-900">{lot.totalCapacity}</div>
                    <div className="text-slate-500">Price</div>
                    <div className="font-medium text-slate-900">{formatYen(atTime.price)}/hr</div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}

        {overlayLines}
      </MapContainer>

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
