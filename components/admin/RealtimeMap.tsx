'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '@/lib/store'
import { initAdminSocket } from '@/lib/socket'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { Globe } from 'lucide-react'

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface Visitor {
  userId: string
  country: string
  city: string
  lat: number
  lon: number
  timestamp: string
  username?: string
}

// Heatmap Layer Component
function HeatmapLayer({ visitors }: { visitors: Visitor[] }) {
  const map = useMap()
  const heatLayerRef = useRef<any>(null)

  useEffect(() => {
    if (!map) return

    // Create heat layer with turuncu gradient
    const heatLayer = (L as any).heatLayer([], {
      radius: 25,
      blur: 15,
      maxZoom: 6,
      gradient: {
        0.4: '#ffecd1', // Açık sarı
        0.6: '#ffb347', // Orta turuncu
        1.0: '#ff7a00', // Koyu turuncu
      },
      minOpacity: 0.3,
    })

    heatLayer.addTo(map)
    heatLayerRef.current = heatLayer

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current)
      }
    }
  }, [map])

  // Update heat layer when visitors change
  useEffect(() => {
    if (!heatLayerRef.current || visitors.length === 0) {
      if (heatLayerRef.current) {
        heatLayerRef.current.setLatLngs([])
      }
      return
    }

    // Create heat points with intensity based on visitor count per location
    const locationMap = new Map<string, { lat: number; lon: number; count: number }>()

    visitors.forEach((visitor) => {
      const key = `${visitor.lat.toFixed(2)}_${visitor.lon.toFixed(2)}`
      const existing = locationMap.get(key)
      if (existing) {
        existing.count += 1
      } else {
        locationMap.set(key, { lat: visitor.lat, lon: visitor.lon, count: 1 })
      }
    })

    // Convert to heat points: [lat, lon, intensity]
    const heatPoints = Array.from(locationMap.values()).map((loc) => [
      loc.lat,
      loc.lon,
      Math.min(loc.count * 0.6, 1.0), // Intensity based on count, max 1.0
    ])

    heatLayerRef.current.setLatLngs(heatPoints)
  }, [visitors])

  return null
}

export default function RealtimeMap() {
  const { accessToken } = useAuthStore()
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [activeCount, setActiveCount] = useState(0)

  useEffect(() => {
    if (!accessToken) return

    const adminSocket = initAdminSocket(accessToken)

    adminSocket.on('visitor:location', (data: Visitor) => {
      setVisitors((prev) => {
        // Remove old entry for same user and add new one
        const filtered = prev.filter((v) => v.userId !== data.userId)
        return [...filtered, data]
      })
    })

    adminSocket.on('connect', () => {
      console.log('RealtimeMap socket connected')
    })

    adminSocket.on('disconnect', () => {
      console.log('RealtimeMap socket disconnected')
    })

    // Clean up old visitors (older than 15 minutes)
    const cleanupInterval = setInterval(() => {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
      setVisitors((prev) =>
        prev.filter((v) => new Date(v.timestamp) > fifteenMinutesAgo)
      )
    }, 60000) // Check every minute

    // Update active count
    const countInterval = setInterval(() => {
      setActiveCount(visitors.length)
    }, 1000)

    return () => {
      adminSocket.disconnect()
      clearInterval(cleanupInterval)
      clearInterval(countInterval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  // Calculate center point (average of all visitors, or default)
  const getCenter = (): [number, number] => {
    if (visitors.length === 0) return [20, 0] // Default center
    const avgLat = visitors.reduce((sum, v) => sum + v.lat, 0) / visitors.length
    const avgLon = visitors.reduce((sum, v) => sum + v.lon, 0) / visitors.length
    return [avgLat, avgLon]
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm dark:bg-[#111] bg-white overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Globe className="text-[#ff7a00]" />
          Canlı Ziyaretçi Haritası (Yoğunluk Görünümü)
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Aktif Ziyaretçiler:</span>
          <span className="px-3 py-1 bg-[#ff7a00] text-white rounded-full text-sm font-semibold">
            {visitors.length}
          </span>
        </div>
      </div>
      <div className="relative">
        {visitors.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] md:h-[450px] bg-gray-50 dark:bg-gray-900/50">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Henüz aktif ziyaretçi yok
            </p>
          </div>
        ) : (
          <div className="h-[300px] md:h-[450px] w-full">
            <MapContainer
              center={getCenter()}
              zoom={3}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
              scrollWheelZoom={true}
            >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              className="dark:invert dark:brightness-75"
            />
            {/* Heatmap Layer - Altta */}
            <HeatmapLayer visitors={visitors} />
            {/* Markers - Üstte */}
            {visitors.map((visitor) => (
              <CircleMarker
                key={visitor.userId}
                center={[visitor.lat, visitor.lon]}
                radius={8}
                pathOptions={{
                  color: '#ff7a00',
                  fillColor: '#ff7a00',
                  fillOpacity: 0.8,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <b className="text-gray-900 dark:text-white">
                      {visitor.city}, {visitor.country}
                    </b>
                    {visitor.username && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        @{visitor.username}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {new Date(visitor.timestamp).toLocaleTimeString('tr-TR')}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  )
}

