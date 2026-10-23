import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Celebrate } from '@/src/components/common/Illustrations'
import { useFarmer, useFarms, usePayouts } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/payout/payout.module.css'
import { money, useMarkPayoutRead } from '@/src/pages/payout/stages'
import { formatPhone } from '@/src/utils/format'

export default function PayoutNotification() {
  const { payoutId } = useParams()
  const navigate = useNavigate()
  const farmer = useFarmer()
  const payout = usePayouts().find((p) => p.id === payoutId)
  const farm = useFarms().find((f) => f.id === payout?.farmId)
  useMarkPayoutRead(payout)

  if (!payout || !farm || !farmer) return <NotFound />

  return (
    <div className={`screen ${styles.celebrate}`}>
      <main className={`screen-body stack ${styles.body}`}>
        <Celebrate className={styles.pop} />
        <h1 className='h2'>
          {t('payout.good', { name: farmer.name.split(' ')[0] })}
        </h1>
        <p className={styles.lead}>
          {t('payout.headline', { crop: t(`crop.${farm.crop}`) })}
        </p>
        <div className={`${styles.amount} ${styles.pop}`}>
          {money(payout.amountKES)}
        </div>
        <p className={styles.line}>
          {t('payout.reason', {
            county: farm.county,
            pct: payout.shortfallPct,
          })}
        </p>
        <p className={`muted ${styles.line}`}>
          {t('payout.mpesa', {
            phone: formatPhone(farmer.phone).replace(/ /g, '\u00a0'),
          })}
        </p>
      </main>
      <div className='screen-footer'>
        <Button
          block
          onClick={() =>
            navigate(`/payout-details/${payout.id}`, { replace: true })
          }
        >
          {t('payout.details')}
        </Button>
        <Button block variant='ghost' onClick={() => navigate('/home')}>
          {t('payout.later')}
        </Button>
      </div>
    </div>
  )
}
