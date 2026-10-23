import { Link } from 'react-router-dom'
import { Chip } from '@/src/components/common/Chip'
import { EmptyState } from '@/src/components/common/ErrorStates'
import { Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import { useFarms, usePayouts } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import styles from '@/src/pages/payout/payout.module.css'
import { latestDate, money } from '@/src/pages/payout/stages'
import { formatDate } from '@/src/utils/format'

export default function PayoutHistory() {
  const payouts = [...usePayouts()].sort((a, b) =>
    latestDate(b).localeCompare(latestDate(a)),
  )
  const farms = useFarms()
  const total = payouts.reduce((s, p) => s + p.amountKES, 0)

  return (
    <Screen nav>
      <div className='stack'>
        <h1 className='h1'>{t('payout.historyTitle')}</h1>
        {payouts.length === 0 ? (
          <EmptyState
            title={t('payout.emptyTitle')}
            message={t('payout.emptyBody')}
          />
        ) : (
          <>
            <section className={styles.total}>
              <div>{t('payout.total')}</div>
              <div className='figure'>{money(total)}</div>
            </section>
            {payouts.map((p) => {
              const farm = farms.find((f) => f.id === p.farmId)
              const date = latestDate(p)
              return (
                <Link
                  key={p.id}
                  to={`/payout-details/${p.id}`}
                  className='card card-tap'
                >
                  <span className={styles.item}>
                    <span className={styles.coin}>
                      <Icon name='cash' />
                    </span>
                    <span className={styles.itemMain}>
                      <span className={`h3 ${styles.name}`}>
                        {farm?.name ?? t('payout.unknownFarm')}
                      </span>
                      <span className={`muted ${styles.block}`}>
                        {date && formatDate(date)}
                      </span>
                      <Chip status={p.stage === 'sent' ? 'good' : 'warning'}>
                        {t(`payout.stage.${p.stage}`)}
                      </Chip>
                    </span>
                    <span className={styles.itemSide}>
                      <strong className={styles.nowrap}>
                        {money(p.amountKES)}
                      </strong>
                    </span>
                  </span>
                </Link>
              )
            })}
          </>
        )}
      </div>
    </Screen>
  )
}
