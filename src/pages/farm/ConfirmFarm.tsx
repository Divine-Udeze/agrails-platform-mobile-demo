import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { CROP_ICON, Icon } from '@/src/components/common/Icons'
import formStyles from '@/src/components/forms/forms.module.css'
import { FarmMap } from '@/src/components/map/FarmMap'
import { MapScreen } from '@/src/components/map/MapScreen'
import { useMapStatus } from '@/src/components/map/useMapStatus'
import styles from '@/src/components/map/map.module.css'
import { useApp, useFarmer, useFarmForm } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import { requiredFormStep } from '@/src/pages/farm/formGuard'
import { createFarm } from '@/src/services/farmService'
import { formatAcres, formatHa } from '@/src/utils/format'
import { validateBoundary } from '@/src/utils/geo'

export default function ConfirmFarm() {
  const navigate = useNavigate()
  const { dispatch } = useApp()
  const farmer = useFarmer()
  const { form, reset } = useFarmForm()
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const { mapKey, onTileError, overlay, banner } = useMapStatus()
  // Synchronous in-flight flag: state would let two same-tick taps both through.
  const inFlight = useRef(false)
  // Set before reset(): the cleared form must not trigger the redirect guards.
  const saved = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const polygons = useMemo(
    () => [{ id: 'new', boundary: form.boundary, color: '#e0a526' }],
    [form.boundary],
  )

  if (saved.current) return null
  const redirect = requiredFormStep(form)
  if (redirect) return <Navigate to={redirect} replace />
  const check = validateBoundary(form.boundary)
  if (!check.ok) return <Navigate to='/boundary-intro' replace />

  const save = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setSaving(true)
    setFailed(false)
    try {
      const farm = await createFarm(form, farmer?.county ?? '')
      dispatch({ type: 'ADD_FARM', farm })
      if (mounted.current) {
        saved.current = true
        reset()
        navigate(`/yield-analysis/${farm.id}`, { replace: true })
      } else {
        // The farmer left mid-save (e.g. hardware back). The farm now exists, so send them
        // to its detail page. Navigate and reset in one transition so whatever guarded page
        // they are on never renders with the cleared form first.
        startTransition(() => {
          navigate(`/farm/${farm.id}`, { replace: true })
          reset()
        })
      }
    } catch {
      inFlight.current = false
      setSaving(false)
      setFailed(true)
    }
  }

  return (
    <MapScreen
      title={t('confirm.title')}
      backDisabled={saving}
      map={
        <FarmMap
          key={mapKey}
          interactive={false}
          fitTo={form.boundary}
          polygons={polygons}
          onTileError={onTileError}
        />
      }
      overlay={overlay}
      banner={banner}
      panel={
        <div className='stack-sm'>
          <p className='muted' style={{ margin: 0 }}>
            {t('confirm.body')}
          </p>
          <div className='row'>
            {form.crop && <Icon name={CROP_ICON[form.crop]} size={32} />}
            <div>
              <div className='h3'>{form.name}</div>
              <div className='muted'>
                {form.crop && t(`crop.${form.crop}`)} ·{' '}
                {form.season && t(`season.${form.season}`)}
              </div>
            </div>
          </div>
          <div className={styles.areaReadout}>
            {t('boundary.area', {
              ha: formatHa(check.areaHa),
              acres: formatAcres(check.areaHa),
            })}
          </div>
          {failed && (
            <p role='alert' className={formStyles.error} style={{ margin: 0 }}>
              {t('error.generic.body')}
            </p>
          )}
          <div className='row'>
            <Button
              variant='secondary'
              disabled={saving}
              onClick={() => navigate('/boundary-intro')}
            >
              {t('confirm.changeShape')}
            </Button>
            <Button block loading={saving} onClick={save}>
              {t('confirm.save')}
            </Button>
          </div>
          <Button
            variant='ghost'
            block
            disabled={saving}
            onClick={() => navigate('/add-farm')}
          >
            {t('confirm.changeDetails')}
          </Button>
        </div>
      }
    />
  )
}
