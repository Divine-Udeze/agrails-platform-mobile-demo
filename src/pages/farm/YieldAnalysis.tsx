import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BarChart } from '@/src/components/charts/BarChart'
import { Gauge } from '@/src/components/charts/Gauge'
import { Button } from '@/src/components/common/Button'
import { Chip } from '@/src/components/common/Chip'
import { ErrorState, LoadingState } from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import { STATUS_COLOR } from '@/src/components/common/statusColor'
import { useFarm, usePolicyForFarm } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/pages.module.css'
import { analyzeFarmYield } from '@/src/services/farmService'
import type { Farm, RiskLevel, YieldAnalysisResult } from '@/src/types'
import { isActiveNow } from '@/src/utils/policy'

const RISK_VALUE: Record<RiskLevel, number> = {
  low: 0.5,
  medium: 1.5,
  high: 2.5,
}

export function useYieldAnalysis(farm?: Farm) {
  const [result, setResult] = useState<YieldAnalysisResult | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const county = farm?.county
  const crop = farm?.crop
  useEffect(() => {
    setResult(null)
    setError(false)
    if (!county || !crop) return
    let live = true
    analyzeFarmYield({ county, crop })
      .then((r) => {
        if (live) setResult(r)
      })
      .catch(() => {
        if (live) setError(true)
      })
    return () => {
      live = false
    }
  }, [county, crop, attempt])
  const retry = () => setAttempt((n) => n + 1)
  return { result, error, retry }
}

const tonnes = (v: number) => `${Number(v.toFixed(1))} t`

export default function YieldAnalysis() {
  const { farmId } = useParams()
  const navigate = useNavigate()
  const farm = useFarm(farmId)
  const policy = usePolicyForFarm(farmId)
  const { result, error, retry } = useYieldAnalysis(farm)
  if (!farm) return <NotFound />

  const insured = !!policy && isActiveNow(policy)
  const footer = result && (
    <>
      {insured ? (
        <Button block onClick={() => navigate(`/farm/${farm.id}`)}>
          {t('yield.backToFarm')}
        </Button>
      ) : (
        <Button
          block
          icon='shield'
          onClick={() => navigate(`/insure/${farm.id}`)}
        >
          {t('yield.cta')}
        </Button>
      )}
    </>
  )

  return (
    <Screen
      header={<Header title={t('yield.title')} back={`/farm/${farm.id}`} />}
      footer={footer}
    >
      {error ? (
        <ErrorState kind='generic' onRetry={retry} />
      ) : !result ? (
        <LoadingState />
      ) : (
        <div className='stack'>
          <p style={{ margin: 0, fontWeight: 700 }}>
            {t('yield.intro', {
              crop: t(`crop.${farm.crop}`),
              county: farm.county,
              n: result.history.length,
            })}
          </p>
          <section className='card stack-sm'>
            <BarChart
              ariaLabel={t('yield.chart')}
              formatValue={tonnes}
              reference={{
                value: result.averageYield,
                label: t('yield.average', { avg: result.averageYield }),
              }}
              bars={result.history.map((y) => {
                const bad = result.belowTriggerYears.includes(y.year)
                return {
                  label: String(y.year).slice(2),
                  value: y.yieldTPerHa,
                  color: bad ? STATUS_COLOR.danger : STATUS_COLOR.good,
                  highlight: bad,
                }
              })}
            />
            <div className={styles.legendRow}>
              <Chip status='danger'>{t('yield.badYear')}</Chip>
              <Chip status='good'>{t('yield.goodYear')}</Chip>
            </div>
          </section>
          <section className='card stack-sm'>
            <h2 className='h3'>{t('yield.riskTitle')}</h2>
            <Gauge
              value={RISK_VALUE[result.riskLevel]}
              min={0}
              max={3}
              bands={[
                { to: 1, color: STATUS_COLOR.good },
                { to: 2, color: STATUS_COLOR.warning },
                { to: 3, color: STATUS_COLOR.danger },
              ]}
              valueLabel={t(`risk.${result.riskLevel}`)}
              caption={t('yield.summary', {
                bad: result.belowTriggerYears.length,
                total: result.history.length,
              })}
              ariaLabel={t('risk.gauge', {
                level: t(`risk.${result.riskLevel}`),
              })}
            />
            <p className='takeaway' style={{ margin: 0 }}>
              {t(`yield.meaning.${result.riskLevel}`)}
            </p>
          </section>
          <Link to={`/yield-report/${farm.id}`} className={styles.linkRow}>
            <span>{t('yield.report')}</span>
            <Icon name='chevron' />
          </Link>
        </div>
      )}
    </Screen>
  )
}
