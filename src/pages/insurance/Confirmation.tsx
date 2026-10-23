import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Celebrate } from '@/src/components/common/Illustrations'
import { Screen } from '@/src/components/common/Screen'
import { useFarm, usePolicies } from '@/src/context/AppContext'
import { t, type StringKey } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/insurance/insurance.module.css'
import { clearPaymentRecorded } from '@/src/services/paymentRegistry'
import { formatDate, formatKES, noWrap } from '@/src/utils/format'
import { isActiveNow, isInsured } from '@/src/utils/policy'

export default function Confirmation() {
  const { farmId } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const farm = useFarm(farmId)
  const policies = usePolicies()
  const policy =
    policies.find(
      (p) => p.id === search.get('policy') && p.farmId === farmId,
    ) ?? policies.find((p) => p.farmId === farmId && isActiveNow(p))
  const hasActive = isInsured(policies, farmId ?? '')
  // the policy is committed, so the registry's just-paid marker can go
  useEffect(() => {
    if (farmId && hasActive) clearPaymentRecorded(farmId)
  }, [farmId, hasActive])
  if (!farm || !policy) return <NotFound />
  const active = isActiveNow(policy)

  const rows: [string, string][] = [
    [t('conf.policyNo'), policy.policyNumber],
    [t('conf.farm'), farm.name],
    [t('conf.plan'), t(`plan.${policy.planId}` as StringKey)],
    [
      t('conf.period'),
      // each date stays whole; the line may only break after the dash
      `${noWrap(formatDate(policy.coverageStart))}\u00a0– ${noWrap(formatDate(policy.coverageEnd))}`,
    ],
    [t('conf.cover'), formatKES(policy.sumInsuredKES)],
    [t('conf.paid'), formatKES(policy.farmerPremiumKES)],
    [t('conf.receipt'), policy.mpesaReceipt],
  ]

  return (
    <Screen
      footer={
        <>
          <Button
            block
            onClick={() => navigate(`/farm/${farm.id}`, { replace: true })}
          >
            {t('conf.goFarm')}
          </Button>
          <Button block variant='ghost' onClick={() => navigate('/policies')}>
            {t('conf.allPolicies')}
          </Button>
        </>
      }
    >
      <div className='stack' style={{ textAlign: 'center' }}>
        {active ? (
          <>
            <Celebrate className={styles.confetti} />
            <h1 className='h1'>{t('conf.title')}</h1>
            <p style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>
              {t('conf.body', { farm: farm.name })}
            </p>
          </>
        ) : (
          <h1 className='h1'>{t('confirm.certTitle')}</h1>
        )}
        <section
          className={`card ${styles.certificate}`}
          style={{ textAlign: 'left' }}
        >
          {active && (
            <h2 className='h3' style={{ marginBottom: 'var(--sp-2)' }}>
              {t('conf.certificate')}
            </h2>
          )}
          {rows.map(([label, value]) => (
            <div key={label} className={styles.certRow}>
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </section>
      </div>
    </Screen>
  )
}
