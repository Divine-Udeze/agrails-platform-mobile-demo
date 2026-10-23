import type { ReactNode } from 'react'
import styles from '@/src/components/charts/charts.module.css'
import { arcPath, clamp } from '@/src/components/charts/scale'

export interface GaugeBand {
  /** upper bound of this band in value units */
  to: number
  color: string
}

interface Props {
  value: number
  min: number
  max: number
  bands: GaugeBand[]
  valueLabel: ReactNode
  caption?: ReactNode
  minLabel?: string
  maxLabel?: string
  ariaLabel: string
}

const CX = 100
const CY = 100
const R = 80

export function Gauge({
  value,
  min,
  max,
  bands,
  valueLabel,
  caption,
  minLabel,
  maxLabel,
  ariaLabel,
}: Props) {
  const angle = (v: number) =>
    -Math.PI / 2 + Math.PI * clamp((v - min) / (max - min), 0, 1)
  const needleDeg = Math.round((angle(value) * 180) / Math.PI)
  let from = min
  return (
    <div className={styles.gauge}>
      <svg
        viewBox='0 0 200 112'
        className={styles.svg}
        role='img'
        aria-label={ariaLabel}
      >
        {bands.map((b) => {
          const d = arcPath(CX, CY, R, angle(from), angle(b.to))
          from = b.to
          return (
            <path
              key={b.to}
              d={d}
              fill='none'
              stroke={b.color}
              strokeWidth={18}
            />
          )
        })}
        <g
          data-testid='gauge-needle'
          data-angle={String(needleDeg)}
          className={styles.needle}
          style={{
            transform: `rotate(${needleDeg}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
          }}
        >
          <line
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - R + 4}
            stroke='var(--ink)'
            strokeWidth={4}
            strokeLinecap='round'
          />
        </g>
        <circle cx={CX} cy={CY} r={8} fill='var(--ink)' />
      </svg>
      {(minLabel || maxLabel) && (
        <div className={styles.gaugeEnds}>
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
      <div className={styles.gaugeValue}>{valueLabel}</div>
      {caption && <div className='muted'>{caption}</div>}
    </div>
  )
}
