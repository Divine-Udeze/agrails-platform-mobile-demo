import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from '@/src/components/common/common.module.css'
import { Icon } from '@/src/components/common/Icons'
import { t } from '@/src/i18n'

interface Props {
  title?: string
  back?: boolean | string
  right?: ReactNode
  transparent?: boolean
}

export function Header({ title, back, right, transparent }: Props) {
  const navigate = useNavigate()
  return (
    <header
      className={`${styles.header} ${transparent ? styles.headerTransparent : ''}`}
    >
      {back && (
        <button
          type='button'
          className={styles.iconBtn}
          aria-label={t('common.back')}
          onClick={() =>
            typeof back === 'string' ? navigate(back) : navigate(-1)
          }
        >
          <Icon name='back' />
        </button>
      )}
      {title ? (
        <h1 className={styles.headerTitle}>{title}</h1>
      ) : (
        // no empty heading for screen readers; still pushes `right` to the end
        <span className={styles.headerSpacer} />
      )}
      {right}
    </header>
  )
}
