import { useCallback, useEffect, useState } from 'react'
import { ErrorState } from '@/src/components/common/ErrorStates'
import styles from '@/src/components/map/map.module.css'
import { t } from '@/src/i18n'

/**
 * Tile-failure state shared by the map pages: a full-screen offline overlay only when
 * the device is really offline, otherwise a small banner that leaves the map usable.
 */
export function useMapStatus() {
  const [offline, setOffline] = useState(false)
  const [slow, setSlow] = useState(false)
  const [mapKey, setMapKey] = useState(0)

  useEffect(() => {
    const goOffline = () => setOffline(true)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const onTileError = useCallback(() => {
    if (navigator.onLine === false) setOffline(true)
    else setSlow(true)
  }, [])

  const retry = useCallback(() => {
    setOffline(false)
    setSlow(false)
    setMapKey((k) => k + 1)
  }, [])

  const overlay = offline ? <ErrorState kind='offline' onRetry={retry} /> : null
  const banner =
    slow && !offline ? (
      <div className={styles.banner} role='status'>
        <span>{t('map.tilesSlow')}</span>
        <button type='button' onClick={retry}>
          {t('common.retry')}
        </button>
      </div>
    ) : null

  return { mapKey, onTileError, overlay, banner }
}
