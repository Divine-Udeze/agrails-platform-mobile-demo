import type { Map as LeafletMap } from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '@/src/components/common/BottomSheet'
import { Button } from '@/src/components/common/Button'
import { Chip } from '@/src/components/common/Chip'
import { EmptyState } from '@/src/components/common/ErrorStates'
import { STATUS_COLOR } from '@/src/components/common/statusColor'
import { FarmMap } from '@/src/components/map/FarmMap'
import { MapScreen } from '@/src/components/map/MapScreen'
import styles from '@/src/components/map/map.module.css'
import { useMapStatus } from '@/src/components/map/useMapStatus'
import { useFarms, usePolicies } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import type { Status } from '@/src/types'
import { formatHa } from '@/src/utils/format'
import { healthStatus } from '@/src/utils/monitor'
import { isInsured } from '@/src/utils/policy'

/** Below this zoom farms are too small to see, so they are drawn as pins. */
const PIN_ZOOM = 14

/**
 * Room kept around the farms so pins and their labels start inside the view:
 * the header and attribution at the top, the panel at the bottom.
 */
const FIT = { top: 96, right: 64, bottom: 260, left: 64 }

const STATUSES: Status[] = ['good', 'warning', 'danger']

export default function AllFarmsMap() {
  const navigate = useNavigate()
  const farms = useFarms()
  const policies = usePolicies()
  const { mapKey, onTileError, overlay, banner } = useMapStatus()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = farms.find((f) => f.id === selectedId)
  const mapRef = useRef<LeafletMap | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const offline = !!overlay

  // A covered aria-modal sheet must not keep focus under the offline overlay.
  useEffect(() => {
    if (!offline) return
    setSelectedId(null)
    // Focus would otherwise return to a pin under the overlay.
    overlayRef.current?.querySelector('button')?.focus()
  }, [offline])

  // No animation: instant and safe for prefers-reduced-motion and slow phones.
  const showFarm = (id: string) => {
    const farm = farms.find((f) => f.id === id)
    if (!farm) return
    mapRef.current?.fitBounds(farm.boundary, {
      animate: false,
      paddingTopLeft: [FIT.left, FIT.top],
      paddingBottomRight: [FIT.right, FIT.bottom],
      maxZoom: 17,
    })
    setFocusedId(id)
    setSelectedId(id)
  }

  const showAll = () => {
    mapRef.current?.fitBounds(fitTo, {
      animate: false,
      paddingTopLeft: [FIT.left, FIT.top],
      paddingBottomRight: [FIT.right, FIT.bottom],
      maxZoom: 18,
    })
    setFocusedId(null)
  }

  const polygons = useMemo(
    () =>
      farms.map((f) => ({
        id: f.id,
        boundary: f.boundary,
        color: STATUS_COLOR[healthStatus(f.healthScore)],
        label: f.name,
        onClick: () => setSelectedId(f.id),
      })),
    [farms],
  )
  const fitTo = useMemo(() => farms.flatMap((f) => f.boundary), [farms])

  const counts = STATUSES.map((s) => ({
    s,
    n: farms.filter((f) => healthStatus(f.healthScore) === s).length,
  }))

  return (
    <MapScreen
      title={t('map.title')}
      back={false}
      nav
      map={
        <FarmMap
          key={mapKey}
          fitTo={fitTo}
          polygons={polygons}
          pinsBelowZoom={PIN_ZOOM}
          fitPadding={FIT}
          onReady={(m) => {
            mapRef.current = m
          }}
          onTileError={onTileError}
        />
      }
      overlay={overlay && <div ref={overlayRef}>{overlay}</div>}
      banner={banner}
      panel={
        <>
          {farms.length === 0 ? (
            <EmptyState
              title={t('home.emptyTitle')}
              message={t('home.emptyBody')}
              action={
                <Button block icon='plus' onClick={() => navigate('/add-farm')}>
                  {t('home.addFarm')}
                </Button>
              }
            />
          ) : (
            <>
              <div className={styles.legendRow}>
                <div className={styles.legend}>
                  {counts
                    .filter((c) => c.n > 0)
                    .map((c) => (
                      <Chip key={c.s} status={c.s}>
                        {`${t(`status.${c.s}`)} ${c.n}`}
                      </Chip>
                    ))}
                </div>
                {focusedId && (
                  <button
                    type='button'
                    className={styles.showAll}
                    onClick={showAll}
                  >
                    {t('map.showAll')}
                  </button>
                )}
              </div>
              <p className={`muted ${styles.legendHint}`}>{t('map.legend')}</p>
              <ul className={styles.farmList} aria-label={t('map.farmList')}>
                {farms.map((f) => (
                  <li key={f.id}>
                    <button
                      type='button'
                      className={styles.farmBtn}
                      onClick={() => showFarm(f.id)}
                    >
                      <span
                        className={styles.farmDot}
                        data-status={healthStatus(f.healthScore)}
                        aria-hidden='true'
                      />
                      {f.name}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <BottomSheet
            open={!!selected && !offline}
            onClose={() => setSelectedId(null)}
            title={selected?.name ?? ''}
          >
            {selected && (
              <div className='stack-sm'>
                <div className='muted'>
                  {t(`crop.${selected.crop}`)} · {formatHa(selected.areaHa)} ·{' '}
                  {selected.county}
                </div>
                <div className={styles.sheetBadges}>
                  <Chip status={healthStatus(selected.healthScore)}>
                    {t('farm.health', { score: selected.healthScore })}
                  </Chip>
                  <Chip
                    status={
                      isInsured(policies, selected.id) ? 'good' : 'neutral'
                    }
                  >
                    {isInsured(policies, selected.id)
                      ? t('farm.insured')
                      : t('farm.notInsured')}
                  </Chip>
                </div>
                <div className='row'>
                  <Button
                    variant='secondary'
                    onClick={() => navigate(`/monitor/${selected.id}`)}
                  >
                    {t('map.health')}
                  </Button>
                  <Button
                    block
                    onClick={() => navigate(`/farm/${selected.id}`)}
                  >
                    {t('map.openFarm')}
                  </Button>
                </div>
              </div>
            )}
          </BottomSheet>
        </>
      }
    />
  )
}
