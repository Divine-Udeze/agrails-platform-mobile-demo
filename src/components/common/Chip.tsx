import type { ReactNode } from 'react'
import styles from '@/src/components/common/common.module.css'
import { Icon, type IconName } from '@/src/components/common/Icons'
import type { Status } from '@/src/types'

export function Chip({
  status = 'neutral',
  icon,
  children,
}: {
  status?: Status | 'neutral'
  icon?: IconName
  children: ReactNode
}) {
  return (
    <span className={styles.chip} data-status={status}>
      {icon && <Icon name={icon} size={14} strokeWidth={2.5} />}
      {children}
    </span>
  )
}
