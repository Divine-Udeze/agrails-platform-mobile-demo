import type { Map as LeafletMap } from 'leaflet'
import { useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Icon } from '@/src/components/common/Icons'
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
import { polygonAreaHa, validateBoundary } from '@/src/utils/geo'

export default function BoundaryMap() {
  const navigate = useNavigate()
  const farmer = useFarmer()
  const { form, update } = useFarmForm()
  const [points, setPoints] = useState<LatLng[]>(
    form.method === 'map' ? form.boundary : [],
  )
  const [error, setError] = useState<string>()
  const { mapKey, onTileError, overlay, banner } = useMapStatus()
  const mapRef = useRef<LeafletMap | null>(null)
  const saved = useRef(false)

  const redirect = requiredFormStep(form)
  if (redirect) return <Navigate to={redirect} replace />

  const area = polygonAreaHa(points)

  const done = () => {
    if (saved.current) return
    const check = validateBoundary(points)
    if (!check.ok) {
      setError(t(`boundary.error.${check.reason}`))
      return
    }
    saved.current = true
    update({ boundary: points, method: 'map' })
    navigate('/confirm-farm')
  }

  const locate = () => {
    const fail = () => setError(t('boundary.locateError'))
    if (!navigator.geolocation) {
      fail()
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setError(undefined)
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 18)
      },
      fail,
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <MapScreen
      title={t('boundary.mapTitle')}
      map={
        <FarmMap
          key={mapKey}
          center={countyCenter(farmer?.county ?? '')}
          zoom={16}
          draft={points}
          onMapClick={(p) => {
            setError(undefined)
            setPoints((prev) => [...prev, p])
          }}
          onReady={(m) => {
            mapRef.current = m
          }}
          onTileError={onTileError}
        />
      }
      overlay={overlay}
      banner={banner}
      panel={
        <div className='stack-sm'>
          <div className='row-between'>
            <div>
              {points.length >= 3 ? (
                <div className={styles.areaReadout}>
                  {t('boundary.area', {
                    ha: formatHa(area),
                    acres: formatAcres(area),
                  })}
                </div>
              ) : (
                <div style={{ fontWeight: 700 }}>{t('boundary.tapHint')}</div>
              )}
              <div className='muted'>
                {t('boundary.points', { n: points.length })}
              </div>
            </div>
            <button
              type='button'
              className={styles.roundBtn}
              aria-label={t('boundary.myLocation')}
              onClick={locate}
            >
              <Icon name='gps' />
            </button>
          </div>
          {error && (
            <p role='alert' className={formStyles.error} style={{ margin: 0 }}>
              {error}
            </p>
          )}
          <div className='row'>
            <Button
              variant='secondary'
              icon='undo'
              disabled={points.length === 0}
              onClick={() => {
                setError(undefined)
                setPoints((prev) => prev.slice(0, -1))
              }}
            >
              {t('boundary.undo')}
            </Button>
            <Button block disabled={points.length < 3} onClick={done}>
              {t('boundary.done')}
            </Button>
          </div>
        </div>
      }
    />
  )
}
