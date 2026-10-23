import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import styles from '@/src/components/map/map.module.css'
import { KENYA_CENTER } from '@/src/data/cropConfig'
import type { LatLng } from '@/src/types'
import { centroid } from '@/src/utils/geo'

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
  /**
   * Below this zoom, polygons are too small to see or tap, so each is drawn as a
   * status-coloured pin at its centroid (same onClick, label beside the pin).
   */
  pinsBelowZoom?: number
  /** px kept clear around `fitTo` (e.g. a large bottom for a panel); default 48 each side */
  fitPadding?: { top: number; right: number; bottom: number; left: number }
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

const PIN_LABEL_OFFSET = 14

function overlaps(a: DOMRect, b: DOMRect) {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  )
}

/** Where a pin label can go, in order of preference after the default (right). */
const LABEL_FALLBACKS: {
  direction: 'left' | 'top' | 'bottom'
  offset: [number, number]
}[] = [
  { direction: 'left', offset: [-PIN_LABEL_OFFSET, 0] },
  { direction: 'top', offset: [0, -PIN_LABEL_OFFSET] },
  { direction: 'bottom', offset: [0, PIN_LABEL_OFFSET] },
]

/**
 * Keep pin labels readable: a label that would leave the map or hit one already
 * shown tries the pin's left, then top, then bottom; only if all four positions
 * fail is it hidden. First in order wins. The pins themselves are never touched.
 */
function declutterLabels(group: L.LayerGroup, map: L.Map) {
  const view = map.getContainer().getBoundingClientRect()
  // Every pin (and its larger hit circle) is an obstacle for other farms' labels.
  const pins: { at: L.LatLng; r: DOMRect }[] = []
  group.eachLayer((layer) => {
    if (!(layer instanceof L.CircleMarker)) return
    const at = layer.getLatLng()
    const p = map.latLngToContainerPoint(at)
    const rad = layer.getRadius()
    const x = view.left + p.x
    const y = view.top + p.y
    pins.push({
      at,
      r: {
        left: x - rad,
        right: x + rad,
        top: y - rad,
        bottom: y + rad,
      } as DOMRect,
    })
  })
  const hitsOtherPin = (r: DOMRect, own?: L.LatLng) =>
    pins.some((o) => !(own && o.at.equals(own)) && overlaps(r, o.r))
  const inside = (r: DOMRect) =>
    view.width === 0 ||
    (r.left >= view.left &&
      r.right <= view.right &&
      r.top >= view.top &&
      r.bottom <= view.bottom)
  const shown: DOMRect[] = []
  const measure = (layer: L.Layer) => {
    const el = layer.getTooltip()?.getElement()
    if (!el) return null
    el.style.visibility = ''
    const r = el.getBoundingClientRect()
    return r.width === 0 || r.height === 0 ? null : { el, r }
  }
  const fits = (r: DOMRect, own?: L.LatLng) =>
    inside(r) && !shown.some((o) => overlaps(r, o)) && !hitsOtherPin(r, own)
  group.eachLayer((layer) => {
    const tip = layer.getTooltip()
    const own = layer instanceof L.CircleMarker ? layer.getLatLng() : undefined
    const first = measure(layer)
    if (!tip || !first) return
    if (fits(first.r, own)) {
      shown.push(first.r)
      return
    }
    // Only pin labels (placed to the right) can move; polygon labels just hide.
    if (tip.options.direction !== 'right') {
      first.el.style.visibility = 'hidden'
      return
    }
    const content = tip.getContent() as string
    for (const spot of LABEL_FALLBACKS) {
      layer.unbindTooltip()
      layer.bindTooltip(content, {
        permanent: true,
        className: 'farm-label',
        ...spot,
      })
      const moved = measure(layer)
      if (!moved) return
      if (fits(moved.r, own)) {
        shown.push(moved.r)
        return
      }
    }
    // Reset to the default side so the failed spot does not leak, then hide.
    layer.unbindTooltip()
    layer.bindTooltip(content, {
      permanent: true,
      className: 'farm-label',
      direction: 'right',
      offset: [PIN_LABEL_OFFSET, 0],
    })
    const reset = measure(layer)
    if (reset) reset.el.style.visibility = 'hidden'
  })
}

export function FarmMap({
  center = KENYA_CENTER,
  zoom = 16,
  fitTo,
  polygons,
  pinsBelowZoom,
  fitPadding,
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
  const [currentZoom, setCurrentZoom] = useState(zoom)
  const clickRef = useRef(onMapClick)
  const tileErrorRef = useRef(onTileError)
  clickRef.current = onMapClick
  tileErrorRef.current = onTileError

  const fitKey = fitTo && fitTo.length ? JSON.stringify(fitTo) : ''
  const fittedKey = useRef<string | null>(null)

  const fitMap = (m: L.Map) => {
    if (!fitTo || fitTo.length === 0) return
    // No animation: the first draw must read the final zoom (pins vs polygons).
    if (fitTo.length === 1)
      m.setView(fitTo[0], Math.max(m.getZoom(), 17), { animate: false })
    else {
      const pad = fitPadding ?? { top: 48, right: 48, bottom: 48, left: 48 }
      m.fitBounds(L.latLngBounds(fitTo), {
        paddingTopLeft: [pad.left, pad.top],
        paddingBottomRight: [pad.right, pad.bottom],
        maxZoom: 18,
        animate: false,
      })
    }
  }

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
    // Fit before the first draw so pins vs polygons is right with no flash.
    fitMap(m)
    fittedKey.current = fitKey
    setCurrentZoom(m.getZoom())
    m.on('zoomend', () => setCurrentZoom(m.getZoom()))
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
    const pins =
      pinsBelowZoom !== undefined && map.current!.getZoom() < pinsBelowZoom
    polygons?.forEach((p) => {
      if (pins) {
        const at = centroid(p.boundary)
        // Invisible larger circle so the pin has a ~44px tap target.
        const hit = L.circleMarker(at, {
          radius: 22,
          stroke: false,
          fillOpacity: 0,
          className: 'farm-pin-hit',
        })
        const pin = L.circleMarker(at, {
          radius: 12,
          color: '#fff',
          weight: 3,
          fillColor: p.color,
          fillOpacity: 1,
          className: 'farm-pin',
        })
        if (p.label)
          pin.bindTooltip(p.label, {
            permanent: true,
            direction: 'right',
            offset: [PIN_LABEL_OFFSET, 0],
            className: 'farm-label',
          })
        if (p.onClick) {
          hit.on('click', p.onClick)
          pin.on('click', p.onClick)
        }
        hit.addTo(group)
        pin.addTo(group)
        return
      }
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
    if (map.current) declutterLabels(group, map.current)
  }, [polygons, pinsBelowZoom, currentZoom, draft, path, marker])

  // Keep the requested area in view.
  useEffect(() => {
    // The create effect already fitted this key on mount.
    if (!map.current || fittedKey.current === fitKey) return
    fittedKey.current = fitKey
    fitMap(map.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey])

  return (
    <div className={styles.mapFill}>
      <div ref={el} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
