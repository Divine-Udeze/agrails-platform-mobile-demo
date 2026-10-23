import { Link, useNavigate } from 'react-router-dom'
import styles from '@/src/components/cards/cards.module.css'
import { CoverageBar } from '@/src/components/cards/CoverageBar'
import { Button } from '@/src/components/common/Button'
import { Chip } from '@/src/components/common/Chip'
import { EmptyState } from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { Screen } from '@/src/components/common/Screen'
import { useFarms, usePolicies } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import {
  displayStatus,
  policyChipStatus,
  sortPolicies,
} from '@/src/pages/profile/policyStatus'
import { formatKES } from '@/src/utils/format'

export default function Policies() {
  const navigate = useNavigate()
  const policies = sortPolicies(usePolicies())
  const farms = useFarms()
  const empty = policies.length === 0
  const hasFarms = farms.length > 0

  return (
    <Screen
      header={<Header title={t('policies.title')} back='/profile' />}
      footer={
        empty && (
          <Button
            block
            icon={hasFarms ? 'shield' : 'plus'}
            onClick={() => navigate(hasFarms ? '/home' : '/add-farm')}
          >
            {hasFarms ? t('policies.insureCta') : t('policies.addFarmCta')}
          </Button>
        )
      }
    >
      {empty ? (
        <EmptyState
          title={t('policies.emptyTitle')}
          message={t('policies.emptyBody')}
        />
      ) : (
        <div className='stack-sm'>
          {policies.map((p) => {
            const farm = farms.find((f) => f.id === p.farmId)
            const status = displayStatus(p)
            const body = (
              <>
                <span className={styles.policyTop}>
                  <span className={`h3 ${styles.policyName}`}>
                    {farm?.name ?? t('policies.unknownFarm')}
                  </span>
                  <Chip status={policyChipStatus(status)}>
                    {t(`policyStatus.${status}`)}
                  </Chip>
                </span>
                <span className={styles.policyMeta}>
                  <span className={styles.nowrap}>{t(`plan.${p.planId}`)}</span>
                  <span className={styles.nowrap}>
                    {t('farm.cover', {
                      amount: formatKES(p.sumInsuredKES),
                    })}
                  </span>
                </span>
                <CoverageBar start={p.coverageStart} end={p.coverageEnd} />
              </>
            )
            const cls = `card stack-sm ${styles.policyRow}`
            // a policy whose farm is gone has no page to open: show it as plain info
            return farm ? (
              <Link
                key={p.id}
                to={`/policy/${p.id}`}
                className={`${cls} card-tap`}
              >
                {body}
              </Link>
            ) : (
              <div key={p.id} className={cls} data-testid='policy-row-static'>
                {body}
              </div>
            )
          })}
        </div>
      )}
    </Screen>
  )
}
