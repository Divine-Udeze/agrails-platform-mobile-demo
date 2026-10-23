import type { ReactNode } from 'react'
import styles from '@/src/components/charts/charts.module.css'

export interface DonutSegment {
  label: string
  value: number
  color: string
}

interface Props {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  centerLabel?: ReactNode
  centerSub?: ReactNode
  formatValue: (v: number) => string
  ariaLabel: string
}

/** Steps the centre text down so long figures stay inside the ring. */
function labelSize(label: ReactNode): 'lg' | 'md' | 'sm' {
  const len = typeof label === 'string' ? label.length : 0
  return len <= 5 ? 'lg' : len === 6 ? 'md' : 'sm'
}

export function Donut({
  segments,
  size = 128,
  thickness = 18,
  centerLabel,
  centerSub,
  formatValue,
  ariaLabel,
}: Props) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const mid = size / 2
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  let offset = 0
  return (
    <div className={styles.donut}>
      <div className={styles.ring} style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          role='img'
          aria-label={ariaLabel}
        >
          <circle
            cx={mid}
            cy={mid}
            r={r}
            fill='none'
            stroke='var(--line)'
            strokeWidth={thickness}
          />
          {segments.map((s) => {
            const len = (s.value / total) * c
            const el = (
              <circle
                key={s.label}
                data-segment={s.label}
                cx={mid}
                cy={mid}
                r={r}
                fill='none'
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${len.toFixed(2)} ${(c - len).toFixed(2)}`}
                strokeDashoffset={(-offset).toFixed(2)}
                transform={`rotate(-90 ${mid} ${mid})`}
              />
            )
            offset += len
            return el
          })}
        </svg>
        <div className={styles.ringCenter} aria-hidden='true'>
          {centerLabel && (
            <span
              className={styles.ringLabel}
              data-size={labelSize(centerLabel)}
            >
              {centerLabel}
            </span>
          )}
          {centerSub && <span className={styles.ringSub}>{centerSub}</span>}
        </div>
      </div>
      <ul className={styles.legend}>
        {segments.map((s) => (
          <li key={s.label} className={styles.legendRow}>
            <span className={styles.swatch} style={{ background: s.color }} />
            <span>{s.label}</span>
            <strong>{formatValue(s.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
