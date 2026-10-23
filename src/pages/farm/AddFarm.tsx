import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Header } from '@/src/components/common/Header'
import { Screen } from '@/src/components/common/Screen'
import { CropPicker } from '@/src/components/forms/CropPicker'
import { Field } from '@/src/components/forms/Field'
import formStyles from '@/src/components/forms/forms.module.css'
import { useApp, useFarm, useFarmForm } from '@/src/context/AppContext'
import { SEASON_WINDOWS } from '@/src/data/cropConfig'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/pages.module.css'
import { updateFarm } from '@/src/services/farmService'
import type { Season } from '@/src/types'
import { todayISO } from '@/src/utils/format'

const STEPS = 4
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const SEASONS: Season[] = ['long_rains', 'short_rains']

function SeasonCard({
  season,
  selected,
  onSelect,
}: {
  season: Season
  selected: boolean
  onSelect: () => void
}) {
  const { startMonth, endMonth } = SEASON_WINDOWS[season]
  return (
    <button
      type='button'
      role='radio'
      aria-checked={selected}
      className={styles.seasonCard}
      onClick={onSelect}
    >
      <div className='h3'>{t(`season.${season}`)}</div>
      <div className={styles.months} aria-hidden='true'>
        {MONTHS.map((m, i) => (
          <span
            key={i}
            className={styles.month}
            data-on={i >= startMonth && i <= endMonth}
          >
            {m}
          </span>
        ))}
      </div>
    </button>
  )
}

export default function AddFarm() {
  const { farmId } = useParams()
  const navigate = useNavigate()
  const { dispatch } = useApp()
  const farm = useFarm(farmId)
  const { form, update, start, reset } = useFarmForm()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const inFlight = useRef(false)
  const saved = useRef(false)
  const editing = !!farmId

  useEffect(() => {
    if (saved.current) return
    if (editing && farm && form.editingFarmId !== farm.id) start(farm)
    if (!editing && form.editingFarmId !== null) start()
    if (!editing && form.editingFarmId === null && !form.plantingDate) {
      update({ plantingDate: todayISO() })
    }
  }, [editing, farm, form.editingFarmId, form.plantingDate, start, update])

  if (editing && !farm) return <NotFound />

  const validate = (): string | undefined => {
    if (step === 0 && form.name.trim().length < 2) return t('addFarm.nameError')
    if (step === 1 && !form.crop) return t('addFarm.cropError')
    if (step === 2 && !form.season) return t('addFarm.seasonError')
    if (step === 3 && !form.plantingDate) return t('addFarm.plantingError')
    return undefined
  }

  const next = async () => {
    const problem = validate()
    setError(problem)
    if (problem) return
    if (step < STEPS - 1) {
      setStep(step + 1)
      return
    }
    if (editing && farm) {
      if (inFlight.current) return
      inFlight.current = true
      setSaving(true)
      try {
        const updated = await updateFarm(farm, form)
        dispatch({ type: 'UPDATE_FARM', farm: updated })
        saved.current = true
        reset()
        navigate(`/farm/${farm.id}`, { replace: true })
      } catch {
        setError(t('editFarm.saveError'))
      } finally {
        inFlight.current = false
        setSaving(false)
      }
    } else {
      navigate('/boundary-intro')
    }
  }

  const back = () => (step === 0 ? navigate(-1) : setStep(step - 1))
  const lastLabel = editing ? t('editFarm.save') : t('addFarm.toBoundary')

  return (
    <Screen
      header={
        <Header
          title={editing ? t('editFarm.title') : t('addFarm.title')}
          back
        />
      }
      footer={
        <div className='row'>
          {step > 0 && (
            <Button variant='secondary' onClick={back}>
              {t('common.back')}
            </Button>
          )}
          <Button block loading={saving} onClick={next}>
            {step === STEPS - 1 ? lastLabel : t('addFarm.next')}
          </Button>
        </div>
      }
    >
      <div className='stack-lg'>
        <div className='stack-sm'>
          <span className='muted'>
            {t('addFarm.step', { n: step + 1, total: STEPS })}
          </span>
          <div className={styles.progress}>
            <div
              className={styles.progressFill}
              style={{ transform: `scaleX(${(step + 1) / STEPS})` }}
            />
          </div>
        </div>

        {step === 0 && (
          <div className='stack'>
            <h2 className='h1'>{t('addFarm.name')}</h2>
            <Field
              id='farm-name'
              label={t('addFarm.nameLabel')}
              hint={t('addFarm.nameHint')}
              error={error}
            >
              <input
                id='farm-name'
                className={formStyles.input}
                value={form.name}
                aria-invalid={!!error}
                onChange={(e) => update({ name: e.target.value })}
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className='stack'>
            <h2 className='h1'>{t('addFarm.crop')}</h2>
            <CropPicker
              value={form.crop}
              onChange={(crop) => update({ crop })}
              label={t('addFarm.crop')}
            />
          </div>
        )}

        {step === 2 && (
          <div className='stack'>
            <h2 className='h1'>{t('addFarm.season')}</h2>
            <div
              role='radiogroup'
              aria-label={t('addFarm.season')}
              className='stack-sm'
            >
              {SEASONS.map((s) => (
                <SeasonCard
                  key={s}
                  season={s}
                  selected={form.season === s}
                  onSelect={() => update({ season: s })}
                />
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className='stack'>
            <h2 className='h1'>{t('addFarm.planting')}</h2>
            <Field id='planting' label={t('addFarm.plantingLabel')}>
              <input
                id='planting'
                type='date'
                className={formStyles.input}
                value={form.plantingDate}
                onChange={(e) => update({ plantingDate: e.target.value })}
              />
            </Field>
          </div>
        )}

        {error && step > 0 && (
          <p role='alert' className={formStyles.error}>
            {error}
          </p>
        )}
      </div>
    </Screen>
  )
}
