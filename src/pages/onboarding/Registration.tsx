import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '@/src/components/common/BottomSheet'
import { Button } from '@/src/components/common/Button'
import { Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import { CropPicker } from '@/src/components/forms/CropPicker'
import { Field } from '@/src/components/forms/Field'
import formStyles from '@/src/components/forms/forms.module.css'
import { useApp } from '@/src/context/AppContext'
import { COUNTIES } from '@/src/data/cropConfig'
import { t } from '@/src/i18n'
import { findPolicyholder, register } from '@/src/services/authService'
import type { Crop } from '@/src/types'
import { isValidName, isValidNationalId } from '@/src/utils/validation'

type Errors = Partial<Record<'name' | 'county' | 'id' | 'crop', string>>

export default function Registration() {
  const navigate = useNavigate()
  const { state, dispatch } = useApp()
  const [name, setName] = useState('')
  const [county, setCounty] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [crop, setCrop] = useState<Crop | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [sheetOpen, setSheetOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [idTaken, setIdTaken] = useState(false)

  const matches = COUNTIES.filter((c) =>
    c.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (saving) return
    const next: Errors = {}
    if (!isValidName(name)) next.name = t('reg.nameError')
    if (!county) next.county = t('reg.countyError')
    if (!isValidNationalId(nationalId)) next.id = t('reg.idError')
    if (!crop) next.crop = t('reg.cropError')
    setErrors(next)
    setIdTaken(false)
    if (Object.keys(next).length || !crop) return
    if (!state.auth.phone) {
      navigate('/phone-entry', { replace: true })
      return
    }
    setSaving(true)
    try {
      if (await findPolicyholder('id', nationalId)) {
        setIdTaken(true)
        setErrors({ id: t('reg.idExists') })
        return
      }
      const farmer = await register({
        phone: state.auth.phone,
        name,
        county,
        nationalId,
        primaryCrop: crop,
      })
      dispatch({ type: 'COMPLETE_REGISTRATION', farmer })
      navigate('/home', { replace: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen
      footer={
        <Button block loading={saving} onClick={() => submit()}>
          {t('reg.submit')}
        </Button>
      }
    >
      <form className='stack-lg' onSubmit={submit} noValidate>
        <div className='stack-sm'>
          <h1 className='h1'>{t('reg.title')}</h1>
          <p className='muted' style={{ fontSize: 'var(--fs-md)' }}>
            {t('reg.body')}
          </p>
        </div>
        <Field id='name' label={t('reg.name')} error={errors.name}>
          <input
            id='name'
            className={formStyles.input}
            autoComplete='name'
            placeholder={t('reg.namePlaceholder')}
            value={name}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field id='county' label={t('reg.county')} error={errors.county}>
          <button
            id='county'
            type='button'
            className={formStyles.selectBtn}
            aria-invalid={!!errors.county}
            aria-describedby={errors.county ? 'county-error' : undefined}
            onClick={() => setSheetOpen(true)}
          >
            <span>{county || t('reg.countyChoose')}</span>
            <Icon name='chevron' />
          </button>
        </Field>
        <Field id='nid' label={t('reg.id')} error={errors.id}>
          <input
            id='nid'
            className={formStyles.input}
            inputMode='numeric'
            value={nationalId}
            aria-invalid={!!errors.id}
            aria-describedby={errors.id ? 'nid-error' : undefined}
            onChange={(e) =>
              setNationalId(e.target.value.replace(/\D/g, '').slice(0, 8))
            }
          />
        </Field>
        {idTaken && (
          <Button
            variant='secondary'
            block
            onClick={() => navigate('/policy-lookup')}
          >
            {t('reg.findPolicy')}
          </Button>
        )}
        <div className='stack-sm'>
          <span className={formStyles.label}>{t('reg.crop')}</span>
          <CropPicker value={crop} onChange={setCrop} label={t('reg.crop')} />
          {errors.crop && (
            <span role='alert' className={formStyles.error}>
              {errors.crop}
            </span>
          )}
        </div>
      </form>
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('reg.county')}
      >
        <label htmlFor='county-search' className='sr-only'>
          {t('reg.countySearch')}
        </label>
        <input
          id='county-search'
          className={formStyles.input}
          placeholder={t('reg.countySearch')}
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={formStyles.list}>
          {matches.length === 0 && (
            <p className='muted'>{t('reg.noCounty', { q: query })}</p>
          )}
          {matches.map((c) => (
            <button
              key={c}
              type='button'
              className={formStyles.listBtn}
              onClick={() => {
                setCounty(c)
                setSheetOpen(false)
                setQuery('')
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </BottomSheet>
    </Screen>
  )
}
