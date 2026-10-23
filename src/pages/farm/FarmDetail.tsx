import { Link, useParams } from 'react-router-dom'
import { Ring } from '@/src/components/charts/Ring'
import { Chip } from '@/src/components/common/Chip'
import { CropTile } from '@/src/components/common/CropTile'
import { Header } from '@/src/components/common/Header'
import { CROP_ICON, Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import { useFarm, usePolicyForFarm } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/pages.module.css'
import type { PolicyStatus } from '@/src/types'
import {
  formatAcres,
  formatDate,
  formatHa,
  formatKES,
} from '@/src/utils/format'
import { buildQuote } from '@/src/utils/insurance'
import { healthStatus } from '@/src/utils/monitor'

const POLICY_CHIP: Record<PolicyStatus, 'good' | 'neutral' | 'warning'> = {
  active: 'good',
  expired: 'neutral',
  claimed: 'warning',
}

export default function FarmDetail() {
  const { farmId } = useParams()
  const farm = useFarm(farmId)
  const policy = usePolicyForFarm(farmId)
  if (!farm) return <NotFound />

  const status = healthStatus(farm.healthScore)
  const insuredNow = policy?.status === 'active'
  const fromPremium = buildQuote(farm, 'basic').farmerPremiumKES

  return (
    <Screen
      header={
        <Header
          back='/home'
          right={
            <Link to={`/edit-farm/${farm.id}`} className='btn btn-ghost'>
              {t('farm.edit')}
            </Link>
          }
        />
      }
    >
      <div className='stack'>
        <div className={styles.farmHero}>
          <CropTile
            crop={farm.crop}
            status={status}
            size={104}
            label={t('farm.cropTile', {
              crop: t(`crop.${farm.crop}`),
              name: farm.name,
            })}
          />
          <div className='stack-sm'>
            <h1 className='h2'>{farm.name}</h1>
            <div className='row' style={{ gap: 6 }}>
              <Icon name={CROP_ICON[farm.crop]} size={20} />
              {t(`crop.${farm.crop}`)}
            </div>
            <div className='muted'>{farm.county}</div>
          </div>
        </div>

        <div className={styles.facts}>
          <div className={styles.fact}>
            <div className={styles.factLabel}>{t('farm.areaLabel')}</div>
            <div className={styles.factValue}>{formatHa(farm.areaHa)}</div>
            <div className='muted'>{formatAcres(farm.areaHa)}</div>
          </div>
          <div className={styles.fact}>
            <div className={styles.factLabel}>{t(`season.${farm.season}`)}</div>
            <div className={styles.factValue}>
              {t('farm.planted', { date: formatDate(farm.plantingDate) })}
            </div>
          </div>
        </div>

        <section className={`card ${styles.healthRow}`}>
          <Ring
            value={farm.healthScore}
            label={farm.healthScore}
            sublabel='/100'
            status={status}
            ariaLabel={t('farm.health', { score: farm.healthScore })}
          />
          <div className='stack-sm' style={{ flex: '1 1 140px' }}>
            <h2 className='h3'>{t('farm.healthTitle')}</h2>
            <Chip status={status}>{t(`status.${status}`)}</Chip>
            <Link to={`/monitor/${farm.id}`} className={styles.healthLink}>
              {t('farm.seeHealth')}
            </Link>
          </div>
        </section>

        {policy && insuredNow ? (
          <section className='card stack-sm'>
            <div className='row-between'>
              <h2 className='h3'>{t('farm.policyTitle')}</h2>
              <Chip status={POLICY_CHIP[policy.status]}>
                {t(`policyStatus.${policy.status}`)}
              </Chip>
            </div>
            <div className='figure-sm'>{t(`plan.${policy.planId}`)}</div>
            <div>
              {t('farm.cover', { amount: formatKES(policy.sumInsuredKES) })}
            </div>
            <div className='muted'>
              {t('farm.coverage', {
                start: formatDate(policy.coverageStart),
                end: formatDate(policy.coverageEnd),
              })}
            </div>
            <Link to={`/policy/${policy.id}`}>{t('farm.viewPolicy')}</Link>
          </section>
        ) : (
          <section
            className='card stack-sm'
            style={{ borderTop: '6px solid var(--gold-500)' }}
          >
            <div className='row'>
              <Icon name='shield' size={32} />
              <h2 className='h3'>{t('farm.protectTitle')}</h2>
            </div>
            <p style={{ margin: 0 }}>
              {t('farm.protectBody', { amount: formatKES(fromPremium) })}
            </p>
            <Link
              to={`/insure/${farm.id}`}
              className='btn btn-primary btn-block'
            >
              {t('farm.protectCta')}
            </Link>
          </section>
        )}

        <div>
          <Link to={`/view-boundary/${farm.id}`} className={styles.linkRow}>
            <span className='row'>
              <Icon name='map' />
              {t('farm.viewBoundary')}
            </span>
            <Icon name='chevron' />
          </Link>
          <Link to={`/yield-analysis/${farm.id}`} className={styles.linkRow}>
            <span className='row'>
              <Icon name='chart' />
              {t('farm.yield')}
            </span>
            <Icon name='chevron' />
          </Link>
        </div>
      </div>
    </Screen>
  )
}
