import { useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { GOLD } from '@/src/components/common/statusColor'
import { FarmMap } from '@/src/components/map/FarmMap'
import { MapScreen } from '@/src/components/map/MapScreen'
import { useMapStatus } from '@/src/components/map/useMapStatus'
import styles from '@/src/components/map/map.module.css'
import { useFarmer, useFarmForm } from '@/src/context/AppContext'
import { countyCenter } from '@/src/data/cropConfig'
import { t } from '@/src/i18n'
import { requiredFormStep } from '@/src/pages/farm/formGuard'
import type { LatLng } from '@/src/types'
import { acresToHa, formatAcres, formatHa } from '@/src/utils/format'
import { squareAround } from '@/src/utils/geo'

const SIZES = [0.5, 1, 2, 5]

export default function BoundaryQuickMap() {
  const navigate = useNavigate()
  const farmer = useFarmer()
  const { form, update } = useFarmForm()
  const [pin, setPin] = useState<LatLng | null>(null)
  const [acres, setAcres] = useState(1)
  const { mapKey, onTileError, overlay, banner } = useMapStatus()
  const saved = useRef(false)

  const ha = acresToHa(acres)
  const boundary = useMemo(() => (pin ? squareAround(pin, ha) : []), [pin, ha])
  const polygons = useMemo(
    () =>
      boundary.length
        ? [{ id: 'quick-square', boundary, color: GOLD }]
        : undefined,
    [boundary],
  )

  const redirect = requiredFormStep(form)
  if (redirect) return <Navigate to={redirect} replace />

  return (
    <MapScreen
      title={t('quick.title')}
      map={
        <FarmMap
          key={mapKey}
          center={countyCenter(farmer?.county ?? '')}
          zoom={16}
          marker={pin ?? undefined}
          polygons={polygons}
          onMapClick={setPin}
          onTileError={onTileError}
        />
      }
      overlay={overlay}
      banner={banner}
      panel={
        <div className='stack-sm'>
          {!pin ? (
            <div style={{ fontWeight: 700 }}>{t('quick.hint')}</div>
          ) : (
            <div className={styles.areaReadout}>
              {t('boundary.area', { ha: formatHa(ha), acres: formatAcres(ha) })}
            </div>
          )}
          <div className='muted'>{t('quick.size')}</div>
          <div
            role='radiogroup'
            aria-label={t('quick.size')}
            className={styles.sizeRow}
          >
            {SIZES.map((n) => (
              <button
                key={n}
                type='button'
                role='radio'
                aria-checked={acres === n}
                className={styles.sizeChip}
                onClick={() => setAcres(n)}
              >
                {n <= 1 ? t('quick.acre', { n }) : t('quick.acres', { n })}
              </button>
            ))}
          </div>
          <Button
            block
            disabled={!pin}
            onClick={() => {
              if (saved.current) return
              saved.current = true
              update({ boundary, method: 'quick' })
              navigate('/confirm-farm')
            }}
          >
            {t('boundary.done')}
          </Button>
        </div>
      }
    />
  )
}
