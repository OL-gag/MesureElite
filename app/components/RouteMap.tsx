'use client'

import { useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { Route } from '@/app/lib/types'
import { useLanguage } from '@/app/lib/i18n/LanguageContext'
import 'leaflet/dist/leaflet.css'

interface RouteMapProps {
  route: Route
}

export default function RouteMap({ route }: RouteMapProps) {
  const { t } = useLanguage()
  const mapRef = useRef<any>(null)

  // Parse GeoJSON geometry to LatLng coordinates
  const getCoordinates = () => {
    if (!route || !route.segments || route.segments.length === 0) {
      return []
    }

    const coords: [number, number][] = []
    // For now, just connect the waypoints since we have lat/lon
    route.waypoints.forEach((wp) => {
      coords.push([wp.lat, wp.lon])
    })
    return coords
  }

  // Create markers for waypoints
  const markers = route.waypoints.map((wp, index) => {
    const isStart = wp.isStartPoint
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
          ${isStart ? 'background-color: #22c55e; border: 3px solid #16a34a;' : 'background-color: #3b82f6; border: 3px solid #1d4ed8;'}
        ">
          ${isStart ? '⭐' : index + 1}
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
              {isStart ? t('map.startPopupPrefix') : t('map.stopPopupPrefix', { sequence: wp.sequence })}
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

  const polylineCoordinates = getCoordinates()
  const bounds = L.latLngBounds(polylineCoordinates)

  return (
    <div className="w-full h-[28rem] sm:h-[32rem] lg:h-[36rem] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
      <MapContainer
        ref={mapRef}
        bounds={bounds}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Polyline
          positions={polylineCoordinates}
          color="#3b82f6"
          weight={3}
          opacity={0.7}
          dashArray="5, 5"
        />
        {markers}
      </MapContainer>
    </div>
  )
}
