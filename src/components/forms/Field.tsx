import type { ReactNode } from 'react'
import styles from '@/src/components/forms/forms.module.css'

interface Props {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
}

export function Field({ id, label, error, hint, children }: Props) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && (
        <span id={`${id}-error`} role='alert' className={styles.error}>
          {error}
        </span>
      )}
    </div>
  )
}
