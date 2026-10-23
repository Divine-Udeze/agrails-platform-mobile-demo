import { Link, useParams } from 'react-router-dom'
import { BarChart } from '@/src/components/charts/BarChart'
import { Header } from '@/src/components/common/Header'
import { ProgressTimeline } from '@/src/components/common/ProgressTimeline'
import { Screen } from '@/src/components/common/Screen'
import { STATUS_COLOR } from '@/src/components/common/statusColor'
import { useFarms, usePayouts, usePolicies } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/payout/payout.module.css'
import { money, stageSteps, useMarkPayoutRead } from '@/src/pages/payout/stages'

export default function PayoutDetails() {
  const { payoutId } = useParams()
  const payout = usePayouts().find((p) => p.id === payoutId)
  const policy = usePolicies().find((p) => p.id === payout?.policyId)
  const farm = useFarms().find((f) => f.id === payout?.farmId)
  useMarkPayoutRead(payout)
  if (!payout || !policy || !farm) return <NotFound />

  const actualPct = Math.round(
    (payout.actualYield / payout.expectedYield) * 100,
  )
  const gap = Math.max(0, policy.triggerYieldPct - actualPct)
  const { steps, currentIndex } = stageSteps(payout)

  return (
    <Screen
      header={<Header title={t('payout.detailsTitle')} back='/payouts' />}
    >
      <div className='stack'>
        <section className={styles.total}>
          <div>{farm.name}</div>
          <div className='figure'>{money(payout.amountKES)}</div>
        </section>

        <section className='card stack-sm'>
          <BarChart
            ariaLabel={t('payout.chart')}
            showValues
            formatValue={(v) =>
              t('payout.yieldUnit', { v: Number(v.toFixed(2)) })
            }
            reference={{
              value: (payout.expectedYield * policy.triggerYieldPct) / 100,
              label: t('payout.level', { pct: policy.triggerYieldPct }),
            }}
            bars={[
              {
                label: t('payout.normal'),
                value: payout.expectedYield,
                color: STATUS_COLOR.good,
              },
              {
                label: t('payout.thisSeason'),
                value: payout.actualYield,
                color: STATUS_COLOR.danger,
                highlight: true,
              },
            ]}
          />
          <p className='takeaway'>
            {t('payout.explain', {
              trigger: policy.triggerYieldPct,
              actual: actualPct,
            })}
          </p>
        </section>

        <section className={`card ${styles.breakdown}`}>
          <div>
            <span>{t('payout.cover')}</span>
            <span>{money(policy.sumInsuredKES)}</span>
          </div>
          <div>
            <span>{t('payout.gap')}</span>
            <span>{t('payout.gapValue', { n: gap })}</span>
          </div>
          <div>
            <span>{t('payout.amount')}</span>
            <span>{money(payout.amountKES)}</span>
          </div>
        </section>

        <section className='card stack-sm'>
          <h2 className='h3'>{t('payout.progress')}</h2>
          <ProgressTimeline steps={steps} currentIndex={currentIndex} />
        </section>

        <Link to={`/policy/${policy.id}`} className={styles.policyLink}>
          {t('farm.viewPolicy')}
        </Link>
      </div>
    </Screen>
  )
}
