import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FarmCard } from '@/src/components/cards/FarmCard'
import { Ring } from '@/src/components/charts/Ring'
import { Button } from '@/src/components/common/Button'
import { EmptyState } from '@/src/components/common/ErrorStates'
import { Icon, type IconName } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import {
  useFarmer,
  useFarms,
  usePayouts,
  usePolicies,
} from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import styles from '@/src/pages/pages.module.css'
import { getWeather, seriesFor } from '@/src/services/monitorService'
import { formatDate, formatHa, formatKES } from '@/src/utils/format'
import { nairobiMidnight } from '@/src/utils/insurance'
import { healthStatus, rainfallDeficitPct } from '@/src/utils/monitor'
import { isActiveNow, isInsured } from '@/src/utils/policy'

const WEATHER_ICON: Record<'sunny' | 'cloudy' | 'rain', IconName> = {
  sunny: 'sun',
  cloudy: 'cloud',
  rain: 'rain',
}

export default function Home() {
  const navigate = useNavigate()
  const farmer = useFarmer()
  const farms = useFarms()
  const policies = usePolicies()
  const payouts = usePayouts()
  const unread = payouts.find((p) => !p.read)
  const worst = [...farms]
    .filter((f) => healthStatus(f.healthScore) !== 'good')
    .sort((a, b) => a.healthScore - b.healthScore)[0]
  const deficit = useMemo(
    () => (worst ? rainfallDeficitPct(seriesFor(worst)) : 0),
    [worst?.id, worst?.crop],
  )
  const totalHa = farms.reduce((s, f) => s + f.areaHa, 0)
  const insuredFarms = farms.filter((f) => isInsured(policies, f.id))
  const insuredHa = insuredFarms.reduce((s, f) => s + f.areaHa, 0)
  const cover = policies
    .filter((p) => isActiveNow(p))
    .reduce((s, p) => s + p.sumInsuredKES, 0)
  // Prefer farms that have never been insured (the clearest upsell), then lapsed ones.
  const uninsured =
    farms.find((f) => !policies.some((p) => p.farmId === f.id)) ??
    farms.find((f) => !isInsured(policies, f.id))
  const pct = totalHa ? Math.round((insuredHa / totalHa) * 100) : 0

  if (!farmer) return null
  const weather = getWeather(farmer.county)

  return (
    <Screen nav>
      <div className='stack'>
        <div>
          <h1 className='h1'>
            {t('home.greeting', { name: farmer.name.split(' ')[0] })}
          </h1>
          <p className='muted' style={{ margin: '4px 0 0' }}>
            {formatDate(new Date(nairobiMidnight()).toISOString())} ·{' '}
            {farmer.county}
          </p>
        </div>

        <div className={styles.weather}>
          <Icon
            name={WEATHER_ICON[weather.condition]}
            size={36}
            className={styles.weatherIcon}
          />
          <div>
            <div style={{ fontWeight: 800 }}>
              {t(`home.weather.${weather.condition}`)}
            </div>
            <div className='muted'>
              {t('home.weather', {
                temp: weather.tempC,
                rain: weather.rainChancePct,
              })}
            </div>
          </div>
        </div>

        {unread && (
          <Link to={`/payout/${unread.id}`} className={styles.payoutBanner}>
            <Icon name='cash' size={32} />
            <span style={{ flex: 1 }}>
              {t('home.payoutBanner', { amount: formatKES(unread.amountKES) })}
            </span>
            <span className='sr-only'>{t('home.payoutCta')}</span>
            <Icon name='chevron' />
          </Link>
        )}

        {worst && (
          <Link
            to={`/monitor/${worst.id}`}
            className={styles.alertCard}
            data-status={healthStatus(worst.healthScore)}
          >
            <Icon name='alert' size={28} />
            <div>
              <div style={{ fontWeight: 800 }}>
                {t('home.alertTitle', {
                  crop: t(`crop.${worst.crop}`),
                  county: worst.county,
                })}
              </div>
              <div>
                {deficit > 0
                  ? t('home.alertDry', { pct: deficit })
                  : t('home.alertGeneric')}
              </div>
            </div>
          </Link>
        )}

        {farms.length > 0 && (
          <section className='card stack-sm'>
            <h2 className='h3'>{t('home.protection')}</h2>
            <div className={styles.protect}>
              <Ring
                value={pct}
                label={`${pct}%`}
                sublabel={t('home.insuredPct')}
                status={pct >= 70 ? 'good' : pct > 0 ? 'warning' : 'danger'}
                ariaLabel={`${pct}% ${t('home.insuredPct')}`}
              />
              <div className='stack-sm'>
                <div style={{ fontWeight: 700 }}>
                  {t('home.insuredOf', {
                    insured: formatHa(insuredHa),
                    total: formatHa(totalHa),
                  })}
                </div>
                <div className='muted'>
                  {t('home.cover', { amount: formatKES(cover) })}
                </div>
              </div>
            </div>
            {uninsured && (
              <Link
                to={`/insure/${uninsured.id}`}
                className={`btn btn-secondary btn-block ${styles.insureLink}`}
              >
                <span className={styles.insureLabel}>
                  {t('home.insureCta', { name: uninsured.name })}
                </span>
              </Link>
            )}
          </section>
        )}

        <div className={styles.sectionHead}>
          <h2 className='h2'>{t('home.myFarms')}</h2>
          {farms.length > 0 && (
            <Button
              variant='ghost'
              icon='plus'
              onClick={() => navigate('/add-farm')}
            >
              {t('home.addFarm')}
            </Button>
          )}
        </div>

        {farms.length === 0 ? (
          <EmptyState
            title={t('home.emptyTitle')}
            message={t('home.emptyBody')}
            action={
              <Button block icon='plus' onClick={() => navigate('/add-farm')}>
                {t('home.addFarm')}
              </Button>
            }
          />
        ) : (
          <div className='stack-sm'>
            {farms.map((f) => (
              <FarmCard
                key={f.id}
                farm={f}
                insured={isInsured(policies, f.id)}
              />
            ))}
          </div>
        )}

        {farms.length > 0 && (
          <div className={styles.quickGrid}>
            <Link to='/add-farm' className={styles.quick}>
              <Icon name='plus' />
              {t('home.addFarm')}
            </Link>
            <Link
              to={uninsured ? `/insure/${uninsured.id}` : '/policies'}
              className={styles.quick}
            >
              <Icon name='shield' />
              {t('home.quickInsure')}
            </Link>
            <Link to='/payouts' className={styles.quick}>
              <Icon name='cash' />
              {t('home.quickPayouts')}
            </Link>
          </div>
        )}
      </div>
    </Screen>
  )
}
