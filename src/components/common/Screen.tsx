import type { ReactNode } from 'react'
import { BottomNav } from '@/src/components/common/BottomNav'
import styles from '@/src/components/common/common.module.css'

interface Props {
  header?: ReactNode
  footer?: ReactNode
  nav?: boolean
  className?: string
  children: ReactNode
}

export function Screen({ header, footer, nav, className, children }: Props) {
  return (
    <div className={`screen ${className ?? ''}`}>
      {header}
      <main className='screen-body fade-in'>{children}</main>
      {footer && (
        <div className={`screen-footer ${nav ? styles.withNavFooter : ''}`}>
          {footer}
        </div>
      )}
      {nav && <BottomNav />}
    </div>
  )
}
