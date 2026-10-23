import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Header } from '@/src/components/common/Header'
import { Screen } from '@/src/components/common/Screen'
import { Field } from '@/src/components/forms/Field'
import formStyles from '@/src/components/forms/forms.module.css'
import { t } from '@/src/i18n'
import {
  findPolicyholder,
  sendOtp,
  type LookupType,
} from '@/src/services/authService'

const MODES: LookupType[] = ['policy', 'id']

export default function PolicyLookup() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<LookupType>('policy')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string>()
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)

  const label = mode === 'policy' ? t('lookup.byPolicy') : t('lookup.byId')

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (loading) return
    setNotFound(false)
    if (!value.trim()) {
      setError(t('lookup.empty'))
      return
    }
    setLoading(true)
    try {
      const found = await findPolicyholder(mode, value)
      if (!found) {
        setNotFound(true)
        setError(t('lookup.notFound'))
        return
      }
      const { hint } = await sendOtp(found.phone)
      navigate('/otp-verification', {
        state: { phone: found.phone, hint, masked: true },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen
      header={<Header back='/' />}
      footer={
        <Button block loading={loading} onClick={() => submit()}>
          {t('common.continue')}
        </Button>
      }
    >
      <form className='stack-lg' onSubmit={submit} noValidate>
        <div className='stack-sm'>
          <h1 className='h1'>{t('lookup.title')}</h1>
          <p className='muted' style={{ fontSize: 'var(--fs-md)' }}>
            {t('lookup.body')}
          </p>
        </div>
        <div
          role='radiogroup'
          aria-label={t('lookup.title')}
          className={formStyles.segment}
        >
          {MODES.map((m) => (
            <button
              key={m}
              type='button'
              role='radio'
              aria-checked={mode === m}
              className={formStyles.segmentBtn}
              onClick={() => {
                setMode(m)
                setValue('')
                setError(undefined)
                setNotFound(false)
              }}
            >
              {m === 'policy' ? t('lookup.byPolicy') : t('lookup.byId')}
            </button>
          ))}
        </div>
        <Field
          id='lookup'
          label={label}
          error={error}
          hint={t('lookup.demoHint')}
        >
          <input
            id='lookup'
            className={formStyles.input}
            inputMode={mode === 'id' ? 'numeric' : 'text'}
            autoCapitalize='characters'
            autoComplete='off'
            placeholder={
              mode === 'policy'
                ? t('lookup.policyPlaceholder')
                : t('lookup.idPlaceholder')
            }
            value={value}
            aria-invalid={!!error}
            aria-describedby={error ? 'lookup-error' : undefined}
            autoFocus
            onChange={(e) => {
              setValue(e.target.value)
              setError(undefined)
              setNotFound(false)
            }}
          />
        </Field>
        {notFound && (
          <Button
            variant='secondary'
            block
            onClick={() => navigate('/phone-entry')}
          >
            {t('lookup.signUp')}
          </Button>
        )}
      </form>
    </Screen>
  )
}
