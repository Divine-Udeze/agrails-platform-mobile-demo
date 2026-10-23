import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import styles from '@/src/components/map/map.module.css'
import { KENYA_CENTER } from '@/src/data/cropConfig'
import type { LatLng } from '@/src/types'

const TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const GOLD = '#e0a526'
const RAIN = '#4a9be0'

export interface MapPolygon {
  id: string
  boundary: LatLng[]
  color: string
  label?: string
  onClick?: () => void
}

export interface FarmMapProps {
  center?: LatLng
  zoom?: number
  fitTo?: LatLng[]
  polygons?: MapPolygon[]
  /** vertices being edited: polyline until 3 points, then a polygon */
  draft?: LatLng[]
  /** GPS walk trace */
  path?: LatLng[]
  marker?: LatLng
  onMapClick?: (p: LatLng) => void
  interactive?: boolean
  onReady?: (map: L.Map) => void
  onTileError?: () => void
}

export function FarmMap({
  center = KENYA_CENTER,
  zoom = 16,
  fitTo,
  polygons,
  draft,
  path,
  marker,
  onMapClick,
  interactive = true,
  onReady,
  onTileError,
}: FarmMapProps) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const overlay = useRef<L.LayerGroup | null>(null)
  const clickRef = useRef(onMapClick)
  const tileErrorRef = useRef(onTileError)
  clickRef.current = onMapClick
  tileErrorRef.current = onTileError

  // Create the map once.
  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: interactive,
    })
    L.control.attribution({ position: 'topright', prefix: false }).addTo(m)
    let errors = 0
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: 'Tiles © Esri' })
      .on('tileerror', () => {
        errors += 1
        if (errors === 3 || !navigator.onLine) tileErrorRef.current?.()
      })
      .addTo(m)
    m.on('click', (e: L.LeafletMouseEvent) =>
      clickRef.current?.([e.latlng.lat, e.latlng.lng]),
    )
    overlay.current = L.layerGroup().addTo(m)
    map.current = m
    onReady?.(m)
    return () => {
      m.remove()
      map.current = null
      overlay.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Redraw overlays whenever they change.
  useEffect(() => {
    const group = overlay.current
    if (!group) return
    group.clearLayers()
    polygons?.forEach((p) => {
      const layer = L.polygon(p.boundary, {
        color: p.color,
        weight: 3,
        fillOpacity: 0.3,
      })
      if (p.label)
        layer.bindTooltip(p.label, {
          permanent: true,
          direction: 'center',
          className: 'farm-label',
        })
      if (p.onClick) layer.on('click', p.onClick)
      layer.addTo(group)
    })
    if (draft && draft.length) {
      const shape =
        draft.length >= 3
          ? L.polygon(draft, { color: GOLD, weight: 3, fillOpacity: 0.25 })
          : L.polyline(draft, { color: GOLD, weight: 3 })
      shape.addTo(group)
      draft.forEach((p) =>
        L.circleMarker(p, {
          radius: 9,
          color: GOLD,
          weight: 3,
          fillColor: '#fff',
          fillOpacity: 1,
        }).addTo(group),
      )
    }
    if (path && path.length) {
      L.polyline(path, { color: RAIN, weight: 5 }).addTo(group)
      L.circleMarker(path[path.length - 1], {
        radius: 10,
        color: '#fff',
        weight: 3,
        fillColor: RAIN,
        fillOpacity: 1,
      }).addTo(group)
    }
    if (marker) {
      L.circleMarker(marker, {
        radius: 12,
        color: '#fff',
        weight: 3,
        fillColor: GOLD,
        fillOpacity: 1,
      }).addTo(group)
    }
  }, [polygons, draft, path, marker])

  // Keep the requested area in view.
  const fitKey = fitTo && fitTo.length ? JSON.stringify(fitTo) : ''
  useEffect(() => {
    if (!map.current || !fitTo || fitTo.length === 0) return
    if (fitTo.length === 1)
      map.current.setView(fitTo[0], Math.max(map.current.getZoom(), 17))
    else
      map.current.fitBounds(L.latLngBounds(fitTo), {
        padding: [48, 48],
        maxZoom: 18,
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey])

  return (
    <div className={styles.mapFill}>
      <div ref={el} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
