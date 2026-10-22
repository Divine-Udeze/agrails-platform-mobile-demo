import { NavLink } from 'react-router-dom'
import styles from '@/src/components/common/common.module.css'
import { Icon, type IconName } from '@/src/components/common/Icons'
import { usePayouts } from '@/src/context/AppContext'
import { t, type StringKey } from '@/src/i18n'

const TABS: { to: string; icon: IconName; label: StringKey }[] = [
  { to: '/home', icon: 'home', label: 'nav.home' },
  { to: '/monitor', icon: 'monitor', label: 'nav.monitor' },
  { to: '/map', icon: 'map', label: 'nav.map' },
  { to: '/payouts', icon: 'payout', label: 'nav.payouts' },
  { to: '/profile', icon: 'profile', label: 'nav.profile' },
]

export function BottomNav() {
  const hasUnread = usePayouts().some((p) => !p.read)
  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.navActive : ''}`
          }
        >
          <Icon name={tab.icon} />
          <span>{t(tab.label)}</span>
          {tab.to === '/payouts' && hasUnread && (
            <span
              className={styles.dot}
              role='img'
              aria-label={t('nav.newPayout')}
            />
          )}
        </NavLink>
      ))}
    </nav>
  )
}
