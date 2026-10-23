import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { STATUS_COLOR } from '@/src/components/common/statusColor'
import { FarmMap } from '@/src/components/map/FarmMap'
import { MapScreen } from '@/src/components/map/MapScreen'
import { useMapStatus } from '@/src/components/map/useMapStatus'
import styles from '@/src/components/map/map.module.css'
import { useFarm } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import { formatAcres, formatHa } from '@/src/utils/format'
import { pathLengthMeters } from '@/src/utils/geo'
import { healthStatus } from '@/src/utils/monitor'

export default function ViewBoundary() {
  const { farmId } = useParams()
  const farm = useFarm(farmId)
  const { mapKey, onTileError, overlay, banner } = useMapStatus()
  const polygons = useMemo(
    () =>
      farm
        ? [
            {
              id: farm.id,
              boundary: farm.boundary,
              color: STATUS_COLOR[healthStatus(farm.healthScore)],
            },
          ]
        : [],
    [farm],
  )
  if (!farm) return <NotFound />
  const perimeter = Math.round(
    pathLengthMeters([...farm.boundary, farm.boundary[0]]),
  )
  return (
    <MapScreen
      title={farm.name}
      back={`/farm/${farm.id}`}
      map={
        <FarmMap
          key={mapKey}
          interactive
          fitTo={farm.boundary}
          polygons={polygons}
          onTileError={onTileError}
        />
      }
      overlay={overlay}
      banner={banner}
      panel={
        <div className='stack-sm'>
          <div className='muted'>{t('view.title')}</div>
          <div className={styles.areaReadout}>
            {t('boundary.area', {
              ha: formatHa(farm.areaHa),
              acres: formatAcres(farm.areaHa),
            })}
          </div>
          <div className='row-between'>
            <span>{t('view.corners', { n: farm.boundary.length })}</span>
            <span>{t('view.perimeter', { m: perimeter })}</span>
          </div>
        </div>
      }
    />
  )
}
