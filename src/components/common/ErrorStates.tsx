import type { ReactNode } from 'react'
import { Button } from '@/src/components/common/Button'
import styles from '@/src/components/common/common.module.css'
import { Icon, type IconName } from '@/src/components/common/Icons'
import { EmptyField } from '@/src/components/common/Illustrations'
import { t, type StringKey } from '@/src/i18n'

type Kind = 'offline' | 'gps' | 'payment' | 'notFound' | 'generic'

const KIND_ICON: Record<Kind, IconName> = {
  offline: 'wifiOff',
  gps: 'gps',
  payment: 'cash',
  notFound: 'map',
  generic: 'alert',
}

export function ErrorState({
  kind,
  title,
  message,
  onRetry,
  action,
}: {
  kind: Kind
  title?: string
  message?: string
  onRetry?: () => void
  action?: ReactNode
}) {
  return (
    <div className={`${styles.state} fade-in`}>
      <div className={styles.stateIcon}>
        <Icon name={KIND_ICON[kind]} size={36} />
      </div>
      <h2 className='h2'>{title ?? t(`error.${kind}.title` as StringKey)}</h2>
      <p className='muted' style={{ margin: 0, fontSize: 'var(--fs-md)' }}>
        {message ?? t(`error.${kind}.body` as StringKey)}
      </p>
      {onRetry && (
        <Button block onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
      {action}
    </div>
  )
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message?: string
  action?: ReactNode
}) {
  return (
    <div className={`${styles.state} fade-in`}>
      <EmptyField className={styles.stateIllo} />
      <h2 className='h3'>{title}</h2>
      {message && (
        <p className='muted' style={{ margin: 0 }}>
          {message}
        </p>
      )}
      {action}
    </div>
  )
}

export function LoadingState({
  label = t('common.loading'),
}: {
  label?: string
}) {
  return (
    <div role='status' aria-label={label} className='stack'>
      <div className={styles.skeleton} />
      <div className={styles.skeleton} style={{ height: 160 }} />
      <div className={styles.skeleton} />
    </div>
  )
}
