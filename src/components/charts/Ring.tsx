import type { ReactNode } from 'react'
import styles from '@/src/components/charts/charts.module.css'
import { clamp } from '@/src/components/charts/scale'
import type { Status } from '@/src/types'

interface Props {
  value: number
  max?: number
  size?: number
  stroke?: number
  status?: Status
  label: ReactNode
  sublabel?: ReactNode
  ariaLabel: string
}

export function Ring({
  value,
  max = 100,
  size = 96,
  stroke = 10,
  status = 'good',
  label,
  sublabel,
  ariaLabel,
}: Props) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = max > 0 ? clamp(value / max, 0, 1) : 0
  const mid = size / 2
  return (
    <div className={styles.ring} style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role='img'
        aria-label={ariaLabel}
        data-status={status}
        className={styles[status]}
      >
        <circle
          cx={mid}
          cy={mid}
          r={r}
          fill='none'
          stroke='var(--line)'
          strokeWidth={stroke}
        />
        {pct > 0 && (
          <circle
            data-testid='ring-value'
            cx={mid}
            cy={mid}
            r={r}
            fill='none'
            stroke='currentColor'
            strokeWidth={stroke}
            strokeLinecap='round'
            strokeDasharray={`${(c * pct).toFixed(2)} ${c.toFixed(2)}`}
            transform={`rotate(-90 ${mid} ${mid})`}
          />
        )}
      </svg>
      <div className={styles.ringCenter} aria-hidden='true'>
        <span className={styles.ringLabel}>{label}</span>
        {sublabel && <span className={styles.ringSub}>{sublabel}</span>}
      </div>
    </div>
  )
}
