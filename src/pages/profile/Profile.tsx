import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import cardStyles from '@/src/components/cards/cards.module.css'
import { BottomSheet } from '@/src/components/common/BottomSheet'
import { Button } from '@/src/components/common/Button'
import { Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import {
  useApp,
  useFarmer,
  usePayouts,
  usePolicies,
} from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import styles from '@/src/pages/pages.module.css'
import { formatPhone } from '@/src/utils/format'

const FAQ = [
  ['help.q1', 'help.a1'],
  ['help.q2', 'help.a2'],
  ['help.q3', 'help.a3'],
] as const

export default function Profile() {
  const navigate = useNavigate()
  const { dispatch } = useApp()
  const farmer = useFarmer()
  const policies = usePolicies()
  const payouts = usePayouts()
  const [helpOpen, setHelpOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  if (!farmer) return null

  const initials = farmer.name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  // LOGOUT also resets the payment session (an AppProvider effect)
  const logout = () => {
    dispatch({ type: 'LOGOUT' })
    navigate('/', { replace: true })
  }

  return (
    <Screen
      nav
      footer={
        <Button
          variant='secondary'
          block
          icon='logout'
          onClick={() => setConfirmOpen(true)}
        >
          {t('profile.logout')}
        </Button>
      }
    >
      <div className='stack'>
        <h1 className='h1'>{t('profile.title')}</h1>
        <section className='card row'>
          <div className={cardStyles.avatar} aria-hidden='true'>
            {initials}
          </div>
          <div className={cardStyles.profileText}>
            <div className='h3'>{farmer.name}</div>
            <div>{formatPhone(farmer.phone)}</div>
            <div className={cardStyles.profileMuted}>{farmer.county}</div>
          </div>
        </section>

        <div>
          <Link to='/policies' className={styles.linkRow}>
            <span className='row'>
              <Icon name='shield' />
              {t('profile.policies')}
            </span>
            <span className='row'>
              {policies.length}
              <Icon name='chevron' />
            </span>
          </Link>
          <Link to='/payouts' className={styles.linkRow}>
            <span className='row'>
              <Icon name='cash' />
              {t('profile.payouts')}
            </span>
            <span className='row'>
              {payouts.length}
              <Icon name='chevron' />
            </span>
          </Link>
        </div>

        <section className='card stack-sm'>
          <h2 className='h3 row'>
            <Icon name='globe' />
            {t('profile.language')}
          </h2>
          <div className={cardStyles.infoRow}>
            <span className={cardStyles.infoValue}>{t('profile.english')}</span>
            <Icon name='check' />
          </div>
          <div className={`${cardStyles.infoRow} ${cardStyles.profileMuted}`}>
            {t('profile.swahili')}
          </div>
        </section>

        <Button
          variant='secondary'
          block
          icon='help'
          onClick={() => setHelpOpen(true)}
        >
          {t('profile.help')}
        </Button>
      </div>

      <BottomSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t('profile.help')}
      >
        <div className='stack'>
          {FAQ.map(([q, a]) => (
            <div key={q} className='stack-sm'>
              <div className='h3'>{t(q)}</div>
              <p className={cardStyles.faqAnswer}>{t(a)}</p>
            </div>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('profile.logoutConfirm')}
      >
        <p className={cardStyles.faqAnswer}>{t('profile.logoutBody')}</p>
        <div className={cardStyles.sheetActions}>
          <Button block icon='logout' onClick={logout}>
            {t('profile.logout')}
          </Button>
          <Button variant='ghost' block onClick={() => setConfirmOpen(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </BottomSheet>
    </Screen>
  )
}
