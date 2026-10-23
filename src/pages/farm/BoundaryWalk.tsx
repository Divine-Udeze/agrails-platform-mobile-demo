import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BottomSheet } from '@/src/components/common/BottomSheet'
import { Button } from '@/src/components/common/Button'
import { Chip } from '@/src/components/common/Chip'
import { ErrorState } from '@/src/components/common/ErrorStates'
import formStyles from '@/src/components/forms/forms.module.css'
import { FarmMap } from '@/src/components/map/FarmMap'
import { MapScreen } from '@/src/components/map/MapScreen'
import { useMapStatus } from '@/src/components/map/useMapStatus'
import { useFarmer, useFarmForm } from '@/src/context/AppContext'
import { countyCenter } from '@/src/data/cropConfig'
import { t } from '@/src/i18n'
import { requiredFormStep } from '@/src/pages/farm/formGuard'
import type { LatLng } from '@/src/types'
import {
  distanceMeters,
  pathLengthMeters,
  traceToBoundary,
  validateBoundary,
} from '@/src/utils/geo'

const MAX_ACCURACY_M = 30
const MIN_STEP_M = 2

const WALK_ERROR = {
  too_few_points: 'walk.tooFew',
  too_small: 'walk.tooSmall',
  too_large: 'walk.tooLarge',
  self_intersecting: 'walk.crossed',
} as const

type Phase = 'ready' | 'walking' | 'gpsError'

export default function BoundaryWalk() {
  const navigate = useNavigate()
  const farmer = useFarmer()
  const { form, update } = useFarmForm()
  const [phase, setPhase] = useState<Phase>('ready')
  const [points, setPoints] = useState<LatLng[]>([])
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [error, setError] = useState<string>()
  const [gpsNote, setGpsNote] = useState<string>()
  const [confirmRestart, setConfirmRestart] = useState(false)
  const { mapKey, onTileError, overlay, banner } = useMapStatus()
  const watchId = useRef<number | null>(null)
  const saved = useRef(false)
  const gotFix = useRef(false)

  const stop = () => {
    if (watchId.current !== null) {
      navigator.geolocation?.clearWatch(watchId.current)
    }
    watchId.current = null
  }
  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation?.clearWatch(watchId.current)
      }
      watchId.current = null
    }
  }, [])

  const last = points[points.length - 1]
  const county = farmer?.county ?? ''
  const center = useMemo(() => countyCenter(county), [county])
  const fitTo = useMemo(() => (last ? [last] : undefined), [last])
  // Before walking, show a shape saved earlier by this same method.
  const previous = form.method === 'walk' ? form.boundary : undefined
  const draft = phase === 'ready' ? previous : undefined

  const redirect = requiredFormStep(form)
  if (redirect) return <Navigate to={redirect} replace />

  const gpsFailed = () => {
    stop()
    setPhase('gpsError')
  }

  const start = () => {
    stop()
    setPoints([])
    setAccuracy(null)
    setError(undefined)
    setGpsNote(undefined)
    gotFix.current = false
    if (!navigator.geolocation) {
      setPhase('gpsError')
      return
    }
    setPhase('walking')
    let failedAtOnce = false
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        gotFix.current = true
        setGpsNote(undefined)
        setAccuracy(Math.round(pos.coords.accuracy))
        if (pos.coords.accuracy > MAX_ACCURACY_M) return
        const p: LatLng = [pos.coords.latitude, pos.coords.longitude]
        setPoints((prev) =>
          prev.length === 0 ||
          distanceMeters(prev[prev.length - 1], p) >= MIN_STEP_M
            ? [...prev, p]
            : prev,
        )
      },
      (err) => {
        // Denied is final. Unavailable is final only before the first fix; later
        // it is a passing dip (trees, buildings). A timeout is always passing.
        if (err.code === 3 || (err.code === 2 && gotFix.current)) {
          setGpsNote(t('walk.gpsSlow'))
          return
        }
        failedAtOnce = true
        gpsFailed()
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    )
    if (failedAtOnce) navigator.geolocation.clearWatch(id)
    else watchId.current = id
  }

  const finish = () => {
    if (saved.current) return
    const boundary = traceToBoundary(points, 1.5)
    const check = validateBoundary(boundary)
    if (!check.ok) {
      // Keep the watch running so the farmer can keep walking.
      setError(t(WALK_ERROR[check.reason]))
      return
    }
    saved.current = true
    stop()
    update({ boundary, method: 'walk' })
    navigate('/confirm-farm')
  }

  const accuracyStatus =
    accuracy === null
      ? 'neutral'
      : accuracy <= 10
        ? 'good'
        : accuracy <= MAX_ACCURACY_M
          ? 'warning'
          : 'danger'

  const gpsOverlay =
    phase === 'gpsError' ? (
      <ErrorState
        kind='gps'
        action={
          <Button
            block
            variant='secondary'
            onClick={() => navigate('/boundary-map', { replace: true })}
          >
            {t('walk.useTap')}
          </Button>
        }
        onRetry={start}
      />
    ) : null

  return (
    <MapScreen
      title={t('walk.title')}
      map={
        <FarmMap
          key={mapKey}
          center={last ?? center}
          zoom={18}
          draft={draft}
          path={points}
          fitTo={fitTo}
          onTileError={onTileError}
        />
      }
      overlay={overlay ?? gpsOverlay}
      banner={banner}
      panel={
        <div className='stack-sm'>
          {phase !== 'walking' ? (
            <>
              <p style={{ margin: 0, fontWeight: 700 }}>{t('walk.ready')}</p>
              <Button block icon='walk' onClick={start}>
                {t('walk.start')}
              </Button>
            </>
          ) : (
            <>
              <div className='row-between'>
                <div className='figure-sm'>
                  {t('walk.distance', {
                    m: Math.round(pathLengthMeters(points)),
                  })}
                </div>
                <Chip status={accuracyStatus}>
                  {accuracy === null
                    ? t('walk.waiting')
                    : t('walk.accuracy', { m: accuracy })}
                </Chip>
              </div>
              <p className='muted' style={{ margin: 0 }}>
                {t('walk.walking')}
              </p>
              {[error, gpsNote].map(
                (msg) =>
                  msg && (
                    <p
                      key={msg}
                      role='alert'
                      className={formStyles.error}
                      style={{ margin: 0 }}
                    >
                      {msg}
                    </p>
                  ),
              )}
              <div className='row'>
                <Button
                  variant='secondary'
                  onClick={() =>
                    points.length > 0 ? setConfirmRestart(true) : start()
                  }
                >
                  {t('walk.restart')}
                </Button>
                <Button block disabled={points.length < 3} onClick={finish}>
                  {t('walk.finish')}
                </Button>
              </div>
            </>
          )}
          <BottomSheet
            open={confirmRestart}
            onClose={() => setConfirmRestart(false)}
            title={t('walk.restartConfirm')}
          >
            <div className='stack-sm'>
              <p style={{ margin: 0 }}>{t('walk.restartBody')}</p>
              <Button
                block
                onClick={() => {
                  setConfirmRestart(false)
                  start()
                }}
              >
                {t('walk.restart')}
              </Button>
              <Button
                block
                variant='secondary'
                onClick={() => setConfirmRestart(false)}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </BottomSheet>
        </div>
      }
    />
  )
}
