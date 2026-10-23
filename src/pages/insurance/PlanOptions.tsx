import { useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Chip } from '@/src/components/common/Chip'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { Screen } from '@/src/components/common/Screen'
import { useFarm, usePolicyForFarm } from '@/src/context/AppContext'
import { PLAN_LIST, RECOMMENDED_PLAN } from '@/src/data/cropConfig'
import { t, type StringKey } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/insurance/insurance.module.css'
import { planFromSearch, useQuotes } from '@/src/pages/insurance/useQuote'
import type { PlanId } from '@/src/types'
import { formatDate, formatKES } from '@/src/utils/format'

export function TriggerBar({ triggerPct }: { triggerPct: number }) {
  const x = 8 + (184 * triggerPct) / 100
  return (
    <svg viewBox='0 0 200 50' className={styles.trigger} aria-hidden='true'>
      <rect
        className={styles.tbSafe}
        x='8'
        y='18'
        width='184'
        height='14'
        rx='7'
      />
      <rect
        className={styles.tbPay}
        x='8'
        y='18'
        width={x - 8}
        height='14'
        rx='7'
      />
      <line className={styles.tbLine} x1={x} x2={x} y1='14' y2='36' />
      <text
        className={styles.tbPct}
        data-testid='trigger-pct'
        x={Math.min(Math.max(x, 16), 184)}
        y='11'
        textAnchor='middle'
      >
        {triggerPct}%
      </text>
      <text className={styles.tbZone} x='8' y='48'>
        {t('plans.payoutZone')}
      </text>
    </svg>
  )
}

export default function PlanOptions() {
  const { farmId } = useParams()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const farm = useFarm(farmId)
  const policy = usePolicyForFarm(farmId)
  const insured = policy?.status === 'active'
  const { quotes, error, retry } = useQuotes(
    insured ? undefined : farm,
    PLAN_LIST,
  )
  const [selected, setSelected] = useState<PlanId>(() => planFromSearch(search))
  const radios = useRef<(HTMLButtonElement | null)[]>([])
  if (!farm) return <NotFound />

  const onKey = (e: KeyboardEvent, index: number) => {
    const step =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? 1
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? -1
          : 0
    if (!step || !quotes) return
    e.preventDefault()
    const next = (index + step + quotes.length) % quotes.length
    setSelected(quotes[next].planId)
    radios.current[next]?.focus()
  }

  if (policy && insured) {
    return (
      <Screen
        header={<Header title={t('plans.title')} back={`/farm/${farm.id}`} />}
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

  return (
    <Screen
      header={<Header title={t('plans.title')} back />}
      footer={
        quotes && (
          <Button
            block
            onClick={() =>
              navigate(`/premium-quote/${farm.id}?plan=${selected}`)
            }
          >
            {t('plans.continue')}
          </Button>
        )
      }
    >
      <div className='stack'>
        <p style={{ margin: 0, fontSize: 'var(--fs-md)' }}>
          {t('plans.intro', { name: farm.name })}
        </p>
        {error ? (
          <ErrorState kind='generic' onRetry={retry} />
        ) : !quotes ? (
          <LoadingState />
        ) : (
          <div
            role='radiogroup'
            aria-label={t('plans.title')}
            className='stack'
          >
            {quotes.map((q, i) => (
              <button
                key={q.planId}
                type='button'
                role='radio'
                aria-checked={selected === q.planId}
                tabIndex={selected === q.planId ? 0 : -1}
                ref={(el) => {
                  radios.current[i] = el
                }}
                onKeyDown={(e) => onKey(e, i)}
                className={`card ${styles.planCard}`}
                onClick={() => setSelected(q.planId)}
              >
                {q.planId === RECOMMENDED_PLAN && (
                  <span className={styles.badge}>
                    <Chip status='good'>{t('plans.recommended')}</Chip>
                  </span>
                )}
                <div className='row-between'>
                  <span className='h3'>
                    {t(`plan.${q.planId}` as StringKey)}
                  </span>
                  <span className={styles.price}>
                    {formatKES(q.farmerPremiumKES)}
                  </span>
                </div>
                <div className='muted' style={{ textAlign: 'right' }}>
                  {t('plans.perSeason')}
                </div>
                <div style={{ fontWeight: 700, margin: '8px 0 4px' }}>
                  {t('plans.cover', { amount: formatKES(q.sumInsuredKES) })}
                </div>
                <div className='muted'>
                  {t('plans.trigger', { pct: q.triggerYieldPct })}
                </div>
                <TriggerBar triggerPct={q.triggerYieldPct} />
              </button>
            ))}
          </div>
        )}
      </div>
    </Screen>
  )
}
