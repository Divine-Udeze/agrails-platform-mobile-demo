import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Header } from '@/src/components/common/Header'
import { Screen } from '@/src/components/common/Screen'
import { Field } from '@/src/components/forms/Field'
import formStyles from '@/src/components/forms/forms.module.css'
import { t } from '@/src/i18n'
import { sendOtp } from '@/src/services/authService'
import { groupLocalPhone } from '@/src/utils/format'
import { normalizeKenyanPhone } from '@/src/utils/validation'

export default function PhoneEntry() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (loading) return
    const phone = normalizeKenyanPhone(value)
    if (!phone) {
      setError(t('phone.error'))
      return
    }
    setLoading(true)
    try {
      const { hint } = await sendOtp(phone)
      navigate('/otp-verification', { state: { phone, hint } })
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
          <h1 className='h1'>{t('phone.title')}</h1>
          <p className='muted' style={{ fontSize: 'var(--fs-md)' }}>
            {t('phone.body')}
          </p>
        </div>
        <Field
          id='phone'
          label={t('phone.label')}
          error={error}
          hint={t('phone.demoHint')}
        >
          <div className={formStyles.phoneRow}>
            <span className={formStyles.prefix}>🇰🇪 +254</span>
            <input
              id='phone'
              className={formStyles.input}
              type='tel'
              inputMode='tel'
              autoComplete='tel-national'
              placeholder={t('phone.placeholder')}
              value={value}
              aria-invalid={!!error}
              aria-describedby={error ? 'phone-error' : undefined}
              autoFocus
              onChange={(e) => {
                setValue(groupLocalPhone(e.target.value))
                setError(undefined)
              }}
            />
          </div>
        </Field>
      </form>
    </Screen>
  )
}
