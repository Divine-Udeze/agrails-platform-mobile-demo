import type { ButtonHTMLAttributes } from 'react'
import styles from '@/src/components/common/common.module.css'
import { Icon, type IconName } from '@/src/components/common/Icons'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  block?: boolean
  loading?: boolean
  icon?: IconName
}

export function Button({
  variant = 'primary',
  block,
  loading,
  icon,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: Props) {
  const cls = ['btn', `btn-${variant}`, block && 'btn-block', className]
    .filter(Boolean)
    .join(' ')
  return (
    <button
      {...rest}
      type={type}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
    >
      {loading ? (
        <span className={styles.spinner} />
      ) : (
        icon && <Icon name={icon} size={20} />
      )}
      {children}
    </button>
  )
}
