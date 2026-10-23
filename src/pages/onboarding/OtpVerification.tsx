import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Header } from '@/src/components/common/Header'
import { Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import formStyles from '@/src/components/forms/forms.module.css'
import { OtpInput } from '@/src/components/forms/OtpInput'
import { useApp } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import styles from '@/src/pages/pages.module.css'
import { sendOtp, verifyOtp } from '@/src/services/authService'
import { formatPhone, maskPhone } from '@/src/utils/format'

const RESEND_SECONDS = 30

export default function OtpVerification() {
  const location = useLocation()
  const navigate = useNavigate()
  const { dispatch } = useApp()
  const state = location.state as {
    phone?: string
    hint?: string
    masked?: boolean
  } | null
  const phone = state?.phone
  const [code, setCode] = useState('')
  const [hint, setHint] = useState(state?.hint ?? '')
  const [error, setError] = useState(false)
  const [errorKey, setErrorKey] = useState(0)
  const [checking, setChecking] = useState(false)
  const [seconds, setSeconds] = useState(RESEND_SECONDS)

  useEffect(() => {
    if (seconds <= 0) return
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds])

  useEffect(() => {
    if (!phone || code.length !== 6 || checking) return
    setChecking(true)
    verifyOtp(phone, code).then((result) => {
      if (!result.ok) {
        setChecking(false)
        setError(true)
        setErrorKey((k) => k + 1)
        setCode('')
        return
      }
      if (result.isNewUser) {
        dispatch({ type: 'LOGIN', phone, isNewUser: true })
        navigate('/registration', { replace: true })
      } else {
        dispatch({ type: 'LOGIN', phone, isNewUser: false, data: result.data })
        navigate('/home', { replace: true })
      }
    })
  }, [code, phone, checking, dispatch, navigate])

  const backTo = state?.masked ? '/policy-lookup' : '/phone-entry'

  if (!phone) return <Navigate to='/phone-entry' replace />

  const resend = async () => {
    setSeconds(RESEND_SECONDS)
    const r = await sendOtp(phone)
    setHint(r.hint)
  }

  return (
    <Screen header={<Header back={backTo} />}>
      <div className='stack-lg'>
        <div className='stack-sm'>
          <h1 className='h1'>{t('otp.title')}</h1>
          <p style={{ margin: 0, fontSize: 'var(--fs-md)' }}>
            {t('otp.body', {
              phone: state?.masked ? maskPhone(phone) : formatPhone(phone),
            })}
          </p>
        </div>
        {hint && (
          <div className={styles.banner}>
            <Icon name='phone' />
            {t('otp.demo', { code: hint })}
          </div>
        )}
        <OtpInput
          value={code}
          onChange={(v) => {
            setError(false)
            setCode(v)
          }}
          error={error}
          disabled={checking}
          errorKey={errorKey}
        />
        {error && (
          <p role='alert' className={formStyles.error} style={{ margin: 0 }}>
            {t('otp.error')}
          </p>
        )}
        {checking && <p className='muted'>{t('otp.verifying')}</p>}
        <div className='stack-sm'>
          <Button
            block
            variant='secondary'
            disabled={seconds > 0}
            onClick={resend}
          >
            {seconds > 0 ? t('otp.resendIn', { s: seconds }) : t('otp.resend')}
          </Button>
          <Button block variant='ghost' onClick={() => navigate(backTo)}>
            {t('otp.changeNumber')}
          </Button>
        </div>
      </div>
    </Screen>
  )
}
