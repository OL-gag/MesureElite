'use client'

import { useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { Route } from '@/app/lib/types'
import { useLanguage } from '@/app/lib/i18n/LanguageContext'
import 'leaflet/dist/leaflet.css'

interface RouteMapProps {
  route: Route
  // Overrides the default height classes. The schedule page uses a shorter
  // map so the sticky map+filter bar doesn't itself exceed the viewport
  // height, leaving no room for the auto-scrolled-to day card below it.
  heightClassName?: string
}

const DEFAULT_HEIGHT_CLASSNAME = 'h-[28rem] sm:h-[32rem] lg:h-[36rem]'

// Cycles blue → green → brown across stops/segments so each leg of the route
// is visually distinguishable on the map, especially where the path crosses
// itself.
const SEGMENT_COLORS = [
  { bg: '#3b82f6', border: '#1d4ed8' }, // blue
  { bg: '#10b981', border: '#047857' }, // green
  { bg: '#78350f', border: '#451a03' }, // dark brown
]

function colorForSequence(sequence: number) {
  return SEGMENT_COLORS[(sequence - 1) % SEGMENT_COLORS.length]
}

export default function RouteMap({ route, heightClassName = DEFAULT_HEIGHT_CLASSNAME }: RouteMapProps) {
  const { t } = useLanguage()
  const mapRef = useRef<any>(null)

  if (!route?.waypoints || route.waypoints.length === 0) {
    return <div className="text-center text-slate-500 dark:text-slate-400 py-8">No waypoints to display</div>
  }

  // The synthetic "return to start" waypoint shares its position (and id)
  // with the real start marker — skip it so it doesn't render a duplicate
  // marker stacked on top of the start.
  const visibleWaypoints = route.waypoints.filter((wp) => !wp.isEndPoint)

  const markers = visibleWaypoints.map((wp) => {
    const isStart = wp.isStartPoint
    // Colored to match the segment arriving at this stop (see colorForSequence).
    const color = isStart ? { bg: '#22c55e', border: '#16a34a' } : (colorForSequence(wp.sequence - 1) || { bg: '#3b82f6', border: '#1d4ed8' })
    const icon = L.divIcon({
      className: isStart ? 'map-marker-start' : 'map-marker-waypoint',
      html: `
        <div style="
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: bold;
          font-size: 14px;
          color: white;
          background-color: ${color.bg}; border: 3px solid ${color.border};
        ">
          ${isStart ? '⭐' : wp.sequence - 1}
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    })

    const segment = route.segments.find((s) => s.fromWaypoint === wp.id)
    const distance = segment ? (segment.distance / 1000).toFixed(1) : '0'
    const duration = segment ? Math.round(segment.duration / 60) : 0

    return (
      <Marker key={wp.id} position={[wp.lat, wp.lon]} icon={icon}>
        <Popup>
          <div className="text-sm">
            <strong>
              {isStart ? t('map.startPopupPrefix') : t('map.stopPopupPrefix', { sequence: wp.sequence - 1 })}
            </strong>
            <p className="mb-2">{wp.displayName}</p>
            {segment && (
              <p className="text-xs text-slate-600">
                → {distance} km, {duration} min
              </p>
            )}
          </div>
        </Popup>
      </Marker>
    )
  })

  // One polyline per segment, colored to match its arrival marker, using the
  // real road-following geometry for that leg. Falls back to a straight line
  // between the two waypoints for routes calculated/cached before per-segment
  // geometry existed.
  const segmentLines = route.segments.map((segment) => {
    const color = colorForSequence(segment.sequence)
    let positions: [number, number][]

    if (segment.geometry && segment.geometry.length > 0) {
      positions = segment.geometry.map(([lon, lat]) => [lat, lon])
    } else {
      const from = route.waypoints.find((wp) => wp.id === segment.fromWaypoint && !wp.isEndPoint)
      const to = route.waypoints.find((wp) => wp.id === segment.toWaypoint && !wp.isEndPoint) ?? route.waypoints[0]
      positions = from && to ? [[from.lat, from.lon], [to.lat, to.lon]] : []
    }

    return (
      <Polyline key={segment.id} positions={positions} color={color.bg} weight={4} opacity={0.85} />
    )
  })

  const boundsArray = visibleWaypoints.map((wp): [number, number] => [wp.lat, wp.lon])
  const bounds = boundsArray.length > 0 ? L.latLngBounds(boundsArray) : L.latLngBounds([[45.5, -73.5], [45.6, -73.4]])

  return (
    <div className={`w-full ${heightClassName} rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700`}>
      <MapContainer
        ref={mapRef}
        bounds={bounds}
        boundsOptions={{ padding: [50, 50] }}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {segmentLines}
        {markers}
      </MapContainer>
    </div>
  )
}
