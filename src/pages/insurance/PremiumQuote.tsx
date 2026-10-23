import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BarChart } from '@/src/components/charts/BarChart'
import { Donut } from '@/src/components/charts/Donut'
import { Button } from '@/src/components/common/Button'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import { useFarm, usePolicyForFarm } from '@/src/context/AppContext'
import { t, type StringKey } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/insurance/insurance.module.css'
import { planFromSearch, useQuotes } from '@/src/pages/insurance/useQuote'
import { formatDate, formatKES, formatNumber } from '@/src/utils/format'

/** keeps "KES 2,520" on one line */
const money = (v: number) => formatKES(v).replace(' ', '\u00a0')

export default function PremiumQuote() {
  const { farmId } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const farm = useFarm(farmId)
  const policy = usePolicyForFarm(farmId)
  const insured = policy?.status === 'active'
  const planId = planFromSearch(search)
  const { quotes, error, retry } = useQuotes(insured ? undefined : farm, [
    planId,
  ])
  const quote = quotes?.[0]
  if (!farm) return <NotFound />

  if (policy && insured) {
    return (
      <Screen
        header={<Header title={t('quote.title')} back={`/farm/${farm.id}`} />}
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
      header={<Header title={t('quote.title')} back />}
      footer={
        quote && (
          <Button
            block
            icon='phone'
            onClick={() => navigate(`/payment/${farm.id}?plan=${planId}`)}
          >
            {t('quote.pay', { amount: formatKES(quote.farmerPremiumKES) })}
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
              {t(`plan.${quote.planId}` as StringKey)} · {farm.name}
            </div>
            <div className={`figure ${styles.heroFigure}`}>
              {t('quote.youPayBig', {
                amount: money(quote.farmerPremiumKES),
              })}
            </div>
            <div>{t('quote.subsidyNote')}</div>
          </section>

          <section className='card stack-sm'>
            <h2 className='h3'>{t('quote.split')}</h2>
            <Donut
              ariaLabel={t('quote.split')}
              formatValue={formatKES}
              centerLabel={formatNumber(quote.premiumKES)}
              centerSub={t('quote.total')}
              segments={[
                {
                  label: t('quote.govPays'),
                  value: quote.subsidyKES,
                  color: 'var(--rain-400)',
                },
                {
                  label: t('quote.youPay'),
                  value: quote.farmerPremiumKES,
                  color: 'var(--green-700)',
                },
              ]}
            />
          </section>

          <section className='card stack-sm'>
            <div className='row-between'>
              <span className='muted'>{t('quote.cover')}</span>
              <strong>{formatKES(quote.sumInsuredKES)}</strong>
            </div>
            <div className='row-between'>
              <span className='muted'>{t('quote.period')}</span>
              <strong>
                {formatDate(quote.coverageStart)} –{' '}
                {formatDate(quote.coverageEnd)}
              </strong>
            </div>
          </section>

          <section className='card stack-sm'>
            <h2 className='h3'>{t('quote.exampleTitle')}</h2>
            <p style={{ margin: 0 }}>
              {t('quote.example', {
                amount: formatKES(quote.exampleAt50PctKES),
              })}
            </p>
            <BarChart
              ariaLabel={t('quote.compare')}
              height={160}
              formatValue={formatKES}
              showValues
              bars={[
                {
                  label: t('quote.youPay'),
                  value: quote.farmerPremiumKES,
                  color: 'var(--gold-500)',
                },
                {
                  label: t('quote.youGet'),
                  value: quote.exampleAt50PctKES,
                  color: 'var(--green-500)',
                },
              ]}
            />
          </section>

          <section className='card stack-sm'>
            <h2 className='h3'>{t('quote.howTitle')}</h2>
            <ol className={styles.how}>
              <li>
                <span className={styles.howIcon}>
                  <Icon name='satellite' />
                </span>
                {t('quote.how1')}
              </li>
              <li>
                <span className={styles.howIcon}>
                  <Icon name='chart' />
                </span>
                {t('quote.how2')}
              </li>
              <li>
                <span className={styles.howIcon}>
                  <Icon name='cash' />
                </span>
                {t('quote.how3', { pct: quote.triggerYieldPct })}
              </li>
            </ol>
          </section>
        </div>
      )}
    </Screen>
  )
}
