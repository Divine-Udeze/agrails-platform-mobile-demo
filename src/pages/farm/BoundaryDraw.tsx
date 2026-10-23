import type { Map as LeafletMap } from 'leaflet'
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import formStyles from '@/src/components/forms/forms.module.css'
import { FarmMap } from '@/src/components/map/FarmMap'
import { MapScreen } from '@/src/components/map/MapScreen'
import { useMapStatus } from '@/src/components/map/useMapStatus'
import styles from '@/src/components/map/map.module.css'
import { useFarmer, useFarmForm } from '@/src/context/AppContext'
import { countyCenter } from '@/src/data/cropConfig'
import { t } from '@/src/i18n'
import { requiredFormStep } from '@/src/pages/farm/formGuard'
import type { LatLng } from '@/src/types'
import { formatAcres, formatHa } from '@/src/utils/format'
import {
  polygonAreaHa,
  traceToBoundary,
  validateBoundary,
} from '@/src/utils/geo'

const MIN_STEP_PX = 8

type Mode = 'draw' | 'move'

export default function BoundaryDraw() {
  const navigate = useNavigate()
  const farmer = useFarmer()
  const { form, update } = useFarmForm()
  const [mode, setMode] = useState<Mode>('draw')
  const [trace, setTrace] = useState<LatLng[]>([])
  const [boundary, setBoundary] = useState<LatLng[]>(
    form.method === 'draw' ? form.boundary : [],
  )
  const [error, setError] = useState<string>()
  const { mapKey, onTileError, overlay, banner } = useMapStatus()
  const activePointer = useRef<number | null>(null)
  const traceRef = useRef<LatLng[]>([])
  const lastScreen = useRef<[number, number]>([0, 0])
  const frame = useRef<number | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const modeRef = useRef<Mode>('draw')
  const saved = useRef(false)

  const county = farmer?.county ?? ''
  const center = useMemo(() => countyCenter(county), [county])

  const cancelFrame = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
  }
  useEffect(() => {
    return () => {
      cancelFrame()
    }
  }, [])

  const redirect = requiredFormStep(form)
  if (redirect) return <Navigate to={redirect} replace />

  // Render the growing trace at most once per frame.
  const scheduleRender = () => {
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      setTrace(traceRef.current.slice())
    })
  }

  const endStroke = () => {
    activePointer.current = null
    traceRef.current = []
    cancelFrame()
    setTrace([])
  }

  // The drawing layer already catches the touches; this also stops the map itself
  // from panning underneath, and gives panning back in Move mode.
  const applyMode = (next: Mode) => {
    modeRef.current = next
    endStroke()
    setMode(next)
    const dragging = mapRef.current?.dragging
    if (next === 'draw') dragging?.disable()
    else dragging?.enable()
  }

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    // A new primary pointer while another is "active" means the old one was lost.
    if (activePointer.current !== null) {
      if (!(e.isPrimary && e.pointerId !== activePointer.current)) return
      endStroke()
    }
    const m = mapRef.current
    if (!m) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const ll = m.containerPointToLatLng([x, y])
    e.currentTarget.setPointerCapture?.(e.pointerId)
    activePointer.current = e.pointerId
    lastScreen.current = [x, y]
    traceRef.current = [[ll.lat, ll.lng]]
    setError(undefined)
    scheduleRender()
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== e.pointerId) return
    const m = mapRef.current
    if (!m) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const [lx, ly] = lastScreen.current
    if (Math.hypot(x - lx, y - ly) < MIN_STEP_PX) return
    lastScreen.current = [x, y]
    const ll = m.containerPointToLatLng([x, y])
    traceRef.current.push([ll.lat, ll.lng])
    scheduleRender()
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== e.pointerId) return
    const corners = traceToBoundary(traceRef.current, 3)
    // A stray tap or tiny stroke keeps the shape that was already there.
    if (corners.length >= 3) setBoundary(corners)
    endStroke()
  }
  const onCancel = (e: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== e.pointerId) return
    endStroke()
  }

  const done = () => {
    if (saved.current) return
    const check = validateBoundary(boundary)
    if (!check.ok) {
      setError(t(`boundary.error.${check.reason}`))
      return
    }
    saved.current = true
    update({ boundary, method: 'draw' })
    navigate('/confirm-farm')
  }

  const area = polygonAreaHa(boundary)

  return (
    <MapScreen
      title={t('draw.title')}
      map={
        <>
          <FarmMap
            key={mapKey}
            center={center}
            zoom={17}
            draft={boundary}
            path={trace}
            onReady={(m) => {
              mapRef.current = m
              if (modeRef.current === 'draw') m.dragging.disable()
            }}
            onTileError={onTileError}
          />
          {mode === 'draw' && (
            <div
              data-testid='draw-layer'
              className={styles.drawLayer}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onCancel}
              onLostPointerCapture={onCancel}
            />
          )}
        </>
      }
      overlay={overlay}
      banner={banner}
      panel={
        <div className='stack-sm'>
          <div
            role='radiogroup'
            aria-label={t('draw.mode')}
            className={styles.sizeRow}
            style={{ gridTemplateColumns: '1fr 1fr' }}
          >
            {(['draw', 'move'] as Mode[]).map((m) => (
              <button
                key={m}
                type='button'
                role='radio'
                aria-checked={mode === m}
                className={styles.sizeChip}
                onClick={() => applyMode(m)}
              >
                {m === 'draw' ? t('draw.drawMode') : t('draw.moveMode')}
              </button>
            ))}
          </div>
          {boundary.length >= 3 ? (
            <div className={styles.areaReadout}>
              {t('boundary.area', {
                ha: formatHa(area),
                acres: formatAcres(area),
              })}
            </div>
          ) : (
            <p style={{ margin: 0, fontWeight: 700 }}>{t('draw.hint')}</p>
          )}
          {error && (
            <p role='alert' className={formStyles.error} style={{ margin: 0 }}>
              {error}
            </p>
          )}
          <div className='row'>
            <Button
              variant='secondary'
              disabled={boundary.length === 0}
              onClick={() => {
                setError(undefined)
                setBoundary([])
              }}
            >
              {t('draw.redraw')}
            </Button>
            <Button block disabled={boundary.length < 3} onClick={done}>
              {t('boundary.done')}
            </Button>
          </div>
        </div>
      }
    />
  )
}
