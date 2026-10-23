import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '@/src/components/common/BottomNav'
import { Icon } from '@/src/components/common/Icons'
import styles from '@/src/components/map/map.module.css'
import { t } from '@/src/i18n'

interface Props {
  title: string
  back?: boolean | string
  backDisabled?: boolean
  /** show the bottom tab bar and lift the panel above it */
  nav?: boolean
  map: ReactNode
  panel: ReactNode
  overlay?: ReactNode
  banner?: ReactNode
}

export function MapScreen({
  title,
  back = true,
  backDisabled = false,
  nav = false,
  map,
  panel,
  overlay,
  banner,
}: Props) {
  const navigate = useNavigate()
  return (
    <div className={styles.mapScreen}>
      {map}
      <header className={styles.top}>
        {back && (
          <button
            type='button'
            className={styles.roundBtn}
            aria-label={t('common.back')}
            disabled={backDisabled}
            onClick={() =>
              typeof back === 'string' ? navigate(back) : navigate(-1)
            }
          >
            <Icon name='back' />
          </button>
        )}
        <h1>{title}</h1>
      </header>
      {banner}
      <main className={`${styles.panel} ${nav ? styles.panelWithNav : ''}`}>
        {panel}
      </main>
      {overlay && (
        <div
          className={`${styles.overlay} ${nav ? styles.overlayWithNav : ''}`}
        >
          {overlay}
        </div>
      )}
      {nav && <BottomNav />}
    </div>
  )
}
