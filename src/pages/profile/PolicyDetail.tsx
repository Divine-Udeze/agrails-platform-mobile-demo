import { Link, useParams } from 'react-router-dom'
import cardStyles from '@/src/components/cards/cards.module.css'
import { CoverageBar } from '@/src/components/cards/CoverageBar'
import { Chip } from '@/src/components/common/Chip'
import { Header } from '@/src/components/common/Header'
import { Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import { useFarms, usePayouts, usePolicies } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import insuranceStyles from '@/src/pages/insurance/insurance.module.css'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/pages.module.css'
import {
  displayStatus,
  policyChipStatus,
} from '@/src/pages/profile/policyStatus'
import { formatKESNoWrap } from '@/src/utils/format'

export default function PolicyDetail() {
  const { policyId } = useParams()
  const policy = usePolicies().find((p) => p.id === policyId)
  const farm = useFarms().find((f) => f.id === policy?.farmId)
  const payouts = usePayouts().filter((p) => p.policyId === policyId)
  if (!policy || !farm) return <NotFound />
  const status = displayStatus(policy)

  const rows: [string, string][] = [
    [t('conf.policyNo'), policy.policyNumber],
    [t('conf.plan'), t(`plan.${policy.planId}`)],
    [t('conf.cover'), formatKESNoWrap(policy.sumInsuredKES)],
    [t('conf.paid'), formatKESNoWrap(policy.farmerPremiumKES)],
    [t('conf.receipt'), policy.mpesaReceipt],
  ]

  return (
    <Screen header={<Header title={t('policy.title')} back='/policies' />}>
      <div className='stack'>
        <section className={`card ${insuranceStyles.certificate}`}>
          <div className={cardStyles.policyTop}>
            <h1 className='h2'>{farm.name}</h1>
            <Chip status={policyChipStatus(status)}>
              {t(`policyStatus.${status}`)}
            </Chip>
          </div>
          {rows.map(([label, value]) => (
            <div key={label} className={insuranceStyles.certRow}>
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </section>

        <section className='card'>
          <h2 className='h3'>{t('policy.coverage')}</h2>
          <CoverageBar start={policy.coverageStart} end={policy.coverageEnd} />
        </section>

        {payouts.length > 0 && (
          <section className='stack-sm'>
            <h2 className='h3'>{t('policy.payouts')}</h2>
            {payouts.map((p) => (
              <Link
                key={p.id}
                to={`/payout-details/${p.id}`}
                className={styles.linkRow}
              >
                <span className='row'>
                  <Icon name='cash' />
                  <span className={cardStyles.nowrap}>
                    {formatKESNoWrap(p.amountKES)}
                  </span>
                </span>
                <Icon name='chevron' />
              </Link>
            ))}
          </section>
        )}

        <Link to={`/farm/${farm.id}`} className={styles.linkRow}>
          {t('policy.openFarm')}
          <Icon name='chevron' />
        </Link>
      </div>
    </Screen>
  )
}
