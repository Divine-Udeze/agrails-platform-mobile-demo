import { useParams } from 'react-router-dom'
import { BarChart } from '@/src/components/charts/BarChart'
import { ErrorState, LoadingState } from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { Screen } from '@/src/components/common/Screen'
import { useFarm } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import { useYieldAnalysis } from '@/src/pages/farm/YieldAnalysis'
import styles from '@/src/pages/pages.module.css'

export default function YieldReport() {
  const { farmId } = useParams()
  const farm = useFarm(farmId)
  const { result, error, retry } = useYieldAnalysis(farm)
  if (!farm) return <NotFound />

  return (
    <Screen
      header={
        <Header title={t('report.title')} back={`/yield-analysis/${farm.id}`} />
      }
    >
      {error ? (
        <ErrorState kind='generic' onRetry={retry} />
      ) : !result ? (
        <LoadingState />
      ) : (
        <div className='stack'>
          <section className='card stack-sm'>
            <h2 className='h3'>{t('report.rainTitle')}</h2>
            <BarChart
              ariaLabel={t('report.rainChart')}
              formatValue={(v) => `${Math.round(v)} mm`}
              bars={result.history.map((y) => ({
                label: String(y.year).slice(2),
                value: y.rainfallMm,
                color: 'var(--rain-400)',
              }))}
            />
          </section>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('report.year')}</th>
                <th>{t('report.rain')}</th>
                <th>{t('report.harvest')}</th>
              </tr>
            </thead>
            <tbody>
              {result.history.map((y) => (
                <tr
                  key={y.year}
                  data-bad={result.belowTriggerYears.includes(y.year)}
                >
                  <td>{y.year}</td>
                  <td>{y.rainfallMm}</td>
                  <td>{y.yieldTPerHa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Screen>
  )
}
