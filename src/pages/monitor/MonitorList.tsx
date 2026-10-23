import { Link, useNavigate } from 'react-router-dom'
import { Ring } from '@/src/components/charts/Ring'
import { Button } from '@/src/components/common/Button'
import { EmptyState } from '@/src/components/common/ErrorStates'
import { Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import { useFarms } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import styles from '@/src/pages/monitor/monitor.module.css'
import { farmSignals } from '@/src/pages/monitor/signals'
import { seriesFor } from '@/src/services/monitorService'
import { healthStatus } from '@/src/utils/monitor'

export default function MonitorList() {
  const farms = useFarms()
  const navigate = useNavigate()
  return (
    <Screen nav>
      <div className='stack'>
        <div>
          <h1 className='h1'>{t('mon.title')}</h1>
          <p className='muted' style={{ margin: '4px 0 0' }}>
            {t('mon.intro')}
          </p>
        </div>
        {farms.length === 0 ? (
          <EmptyState
            title={t('mon.emptyTitle')}
            message={t('mon.emptyBody')}
            action={
              <Button block icon='plus' onClick={() => navigate('/add-farm')}>
                {t('home.addFarm')}
              </Button>
            }
          />
        ) : (
          farms.map((farm) => {
            const status = healthStatus(farm.healthScore)
            const issues = farmSignals(seriesFor(farm), farm.crop).filter(
              (s) => s.status !== 'good',
            )
            return (
              <Link
                key={farm.id}
                to={`/monitor/${farm.id}`}
                className={`card card-tap ${styles.row}`}
              >
                {/* hidden from screen readers so the link name starts with the farm name */}
                <div aria-hidden='true'>
                  <Ring
                    value={farm.healthScore}
                    size={72}
                    stroke={8}
                    status={status}
                    label={farm.healthScore}
                    ariaLabel={t('farm.health', { score: farm.healthScore })}
                  />
                </div>
                <div>
                  <div className='h3'>{farm.name}</div>
                  <div className={styles.signals}>
                    {issues.length === 0 ? (
                      <span className={styles.signal} data-status='good'>
                        {t('mon.allGood')}
                      </span>
                    ) : (
                      issues.map((s) => (
                        <span
                          key={s.key}
                          className={styles.signal}
                          data-status={s.status}
                        >
                          {s.text}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <Icon name='chevron' />
              </Link>
            )
          })
        )}
      </div>
    </Screen>
  )
}
