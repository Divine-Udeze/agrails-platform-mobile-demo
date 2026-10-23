import type { ReactNode } from 'react'
import styles from '@/src/components/common/common.module.css'
import { Icon } from '@/src/components/common/Icons'
import { t } from '@/src/i18n'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function BottomSheet({ open, onClose, title, children }: Props) {
  if (!open) return null
  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div
        className={styles.sheet}
        role='dialog'
        aria-modal='true'
        aria-label={title}
      >
        <div className='row-between'>
          <h2 className='h3'>{title}</h2>
          <button
            type='button'
            className={styles.iconBtn}
            aria-label={t('common.close')}
            onClick={onClose}
          >
            <Icon name='close' />
          </button>
        </div>
        <div style={{ marginTop: 'var(--sp-3)' }}>{children}</div>
      </div>
    </>
  )
}
