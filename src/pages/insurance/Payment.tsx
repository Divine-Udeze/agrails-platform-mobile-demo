import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Chip } from '@/src/components/common/Chip'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { PhonePay } from '@/src/components/common/Illustrations'
import { Screen } from '@/src/components/common/Screen'
import { Field } from '@/src/components/forms/Field'
import formStyles from '@/src/components/forms/forms.module.css'
import {
  useApp,
  useFarm,
  useFarmer,
  usePolicyForFarm,
} from '@/src/context/AppContext'
import { t, type StringKey } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/insurance/insurance.module.css'
import { planFromSearch, useQuotes } from '@/src/pages/insurance/useQuote'
import {
  clearPaymentIssue,
  clearPaymentRecorded,
  markPaymentRecorded,
  paymentSession,
  hasPaymentIssue,
  pendingInfo,
  pendingPayment,
  startPayment,
  type PaymentInfo,
  type PaymentOutcome,
} from '@/src/services/paymentRegistry'
import { requestMpesaPayment } from '@/src/services/paymentService'
import { createPolicy } from '@/src/services/policyService'
import { formatDate, formatKES } from '@/src/utils/format'
import { isActiveNow } from '@/src/utils/policy'
import { normalizeKenyanPhone } from '@/src/utils/validation'

type Phase = 'confirm' | 'waiting' | 'failed' | 'timeout' | 'issue' | 'blocked'
const WAIT_SECONDS = 60

const remainingSeconds = (info?: PaymentInfo) =>
  info
    ? Math.max(
        0,
        WAIT_SECONDS - Math.floor((Date.now() - info.startedAt) / 1000),
      )
    : WAIT_SECONDS

export default function Payment() {
  const { farmId = '' } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const { dispatch } = useApp()
  const farmer = useFarmer()
  const farm = useFarm(farmId)
  const policy = usePolicyForFarm(farmId)
  const planId = planFromSearch(search)
  // The payment this page is attached to. A payment already running for this
  // farm (started by an earlier visit) is picked up, never duplicated.
  const attached = useRef<Promise<PaymentOutcome> | null>(
    pendingPayment(farmId) ?? null,
  )
  // amount and start time of that payment, so a return shows the same screen
  const info = useRef<PaymentInfo | undefined>(
    attached.current ? pendingInfo(farmId) : undefined,
  )
  const [phase, setPhase] = useState<Phase>(
    attached.current
      ? 'waiting'
      : hasPaymentIssue(farmId)
        ? 'issue'
        : 'confirm',
  )
  // While waiting, the farm turning insured (our own success) is not "already
  // insured": the page stays on the waiting view until it navigates.
  const insured = !!policy && isActiveNow(policy) && phase !== 'waiting'
  const { quotes, error, retry } = useQuotes(insured ? undefined : farm, [
    planId,
  ])
  const quote = quotes?.[0]
  const [phone, setPhone] = useState(
    (farmer?.phone ?? '').replace(/^\+254/, ''),
  )
  const [phoneError, setPhoneError] = useState<string>()
  const [seconds, setSeconds] = useState(() => remainingSeconds(info.current))
  // A ref, not state: it must block a second tap before React re-renders.
  const inFlight = useRef(attached.current !== null)
  // Latest active-policy state, read just before a charge is sent.
  const activePolicy = useRef(false)

  useEffect(() => {
    const active = !!policy && isActiveNow(policy)
    activePolicy.current = active
    // the policy is committed, so the active-policy guard takes over
    if (active) clearPaymentRecorded(farmId)
  })

  useEffect(() => {
    if (phase !== 'waiting' || seconds <= 0) return
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => {
      clearTimeout(id)
    }
  }, [phase, seconds])

  // Leaving the issue screen by any route (even the header back) acknowledges it.
  useEffect(() => {
    if (phase !== 'issue') return
    return () => {
      clearPaymentIssue(farmId)
    }
  }, [phase, farmId])

  // Follow the payment. Only the registry records the policy; this page just
  // reacts, and only while it is still mounted (the cleanup flips `live`).
  useEffect(() => {
    if (phase !== 'waiting') return
    const payment = attached.current
    if (!payment) {
      inFlight.current = false
      setPhase('confirm')
      return
    }
    let live = true
    void payment.then((outcome) => {
      if (!live) return
      attached.current = null
      if (outcome.status === 'success') {
        navigate(`/confirmation/${farmId}?policy=${outcome.policy.id}`, {
          replace: true,
        })
        return
      }
      inFlight.current = false
      if (outcome.status === 'failed' || outcome.status === 'timeout') {
        info.current = undefined
      }
      setPhase(
        outcome.status === 'failed' || outcome.status === 'timeout'
          ? outcome.status
          : outcome.status === 'issue'
            ? 'issue'
            : 'blocked',
      )
    })
    return () => {
      live = false
    }
  }, [phase, farmId, navigate])

  if (!farm) return <NotFound />

  if (policy && insured) {
    return (
      <Screen
        header={<Header title={t('pay.title')} back={`/farm/${farm.id}`} />}
      >
        <EmptyState
          title={t('plans.alreadyTitle')}
          message={t('plans.alreadyBody', {
            date: formatDate(policy.coverageEnd),
          })}
          action={
            <Button block onClick={() => navigate(`/policy/${policy.id}`)}>
              {t('plans.viewPolicy')}
            </Button>
          }
        />
      </Screen>
    )
  }

  // while waiting, show what was charged, never a reloaded quote
  const amountKES =
    phase === 'waiting' && info.current
      ? info.current.amountKES
      : quote?.farmerPremiumKES
  const amount = amountKES === undefined ? '' : formatKES(amountKES)

  const pay = () => {
    if (inFlight.current || !quote) return
    const e164 = normalizeKenyanPhone(phone)
    if (!e164) {
      setPhoneError(t('phone.error'))
      return
    }
    inFlight.current = true
    const token = paymentSession()
    const run = async (): Promise<PaymentOutcome> => {
      // let the latest committed state settle, then never charge an insured farm
      await Promise.resolve()
      if (activePolicy.current) return { status: 'blocked' }
      let moneyTaken = false
      try {
        const result = await requestMpesaPayment(e164, quote.farmerPremiumKES)
        if (result.status !== 'success') return { status: result.status }
        moneyTaken = true
        const created = await createPolicy(quote, result.receipt)
        // Money was taken under an old session (login/logout since): record
        // nothing in the new user's state.
        if (token !== paymentSession()) return { status: 'failed' }
        markPaymentRecorded(quote.farmId)
        // Recorded here, whether or not any page is still watching.
        dispatch({ type: 'ADD_POLICY', policy: created })
        return { status: 'success', policy: created }
      } catch {
        return { status: moneyTaken ? 'issue' : 'failed' }
      }
    }
    attached.current = startPayment(farm.id, quote.farmerPremiumKES, run)
    info.current = pendingInfo(farm.id)
    setSeconds(WAIT_SECONDS)
    setPhase('waiting')
  }

  const backToConfirm = () => {
    inFlight.current = false
    setPhase('confirm')
  }

  if (phase === 'waiting') {
    return (
      <Screen
        footer={
          <Button
            variant='ghost'
            block
            onClick={() => navigate(`/farm/${farm.id}`)}
          >
            {t('pay.hide')}
          </Button>
        }
      >
        <div
          className='stack'
          style={{ textAlign: 'center', paddingTop: 'var(--sp-6)' }}
        >
          <PhonePay className={styles.pulse} />
          <h1 className='h1'>{t('pay.waitTitle')}</h1>
          <p style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>
            {t('pay.waitBody', { amount })}
          </p>
          <div>
            <Chip status='warning'>
              {seconds > 0
                ? t('pay.countdown', { s: seconds })
                : t('pay.stillWaiting')}
            </Chip>
          </div>
        </div>
      </Screen>
    )
  }

  if (phase === 'issue') {
    return (
      <Screen header={<Header back={`/farm/${farm.id}`} />}>
        <ErrorState
          kind='payment'
          title={t('pay.issueTitle')}
          message={t('pay.issueBody')}
          action={
            <Button
              block
              onClick={() => {
                clearPaymentIssue(farm.id)
                navigate(`/farm/${farm.id}`)
              }}
            >
              {t('conf.goFarm')}
            </Button>
          }
        />
      </Screen>
    )
  }

  if (phase === 'blocked') {
    // blocked with no active policy to explain it (the insured guard above
    // handles the usual case): say so, and let the farmer try again
    return (
      <Screen header={<Header back={`/farm/${farm.id}`} />}>
        <ErrorState
          kind='generic'
          onRetry={() => {
            clearPaymentRecorded(farm.id)
            backToConfirm()
          }}
        />
      </Screen>
    )
  }

  if (phase === 'failed' || phase === 'timeout') {
    return (
      <Screen header={<Header back={`/farm/${farm.id}`} />}>
        <ErrorState
          kind='payment'
          title={phase === 'timeout' ? t('pay.timeoutTitle') : undefined}
          message={phase === 'timeout' ? t('pay.timeoutBody') : undefined}
          onRetry={backToConfirm}
        />
      </Screen>
    )
  }

  return (
    <Screen
      header={<Header title={t('pay.title')} back />}
      footer={
        quote && (
          <Button block icon='phone' onClick={pay}>
            {t('pay.cta', { amount })}
          </Button>
        )
      }
    >
      {error ? (
        <ErrorState kind='generic' onRetry={retry} />
      ) : !quote ? (
        <LoadingState />
      ) : (
        <div className='stack'>
          <section className={styles.bigPay}>
            <div>
              {t('pay.for', {
                plan: t(`plan.${planId}` as StringKey),
                farm: farm.name,
              })}
            </div>
            <div className='figure'>{amount}</div>
          </section>
          <Field
            id='mpesa'
            label={t('pay.number')}
            error={phoneError}
            hint={t('pay.demoHint')}
          >
            <div className={formStyles.phoneRow}>
              <span className={formStyles.prefix}>+254</span>
              <input
                id='mpesa'
                className={formStyles.input}
                type='tel'
                inputMode='tel'
                value={phone}
                aria-invalid={!!phoneError}
                onChange={(e) => {
                  setPhone(e.target.value)
                  setPhoneError(undefined)
                }}
              />
            </div>
          </Field>
        </div>
      )}
    </Screen>
  )
}
