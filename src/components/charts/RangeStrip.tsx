import { useState } from 'react'
import { ChartTooltip } from '@/src/components/charts/ChartTooltip'
import styles from '@/src/components/charts/charts.module.css'
import { linearScale, niceTicks } from '@/src/components/charts/scale'

export interface RangeRow {
  label: string
  min: number
  max: number
  flagged?: boolean
}

interface Props {
  rows: RangeRow[]
  unit: string
  ariaLabel: string
  threshold?: { value: number; label: string }
}

const W = 320
const LABEL_W = 52
const ROW_H = 22
const TOP = 22

export function RangeStrip({ rows, unit, ariaLabel, threshold }: Props) {
  const [active, setActive] = useState<number | null>(null)
  const lo = Math.min(...rows.map((r) => r.min))
  const hi = Math.max(...rows.map((r) => r.max), threshold?.value ?? -Infinity)
  const ticks = niceTicks(lo, hi, 4)
  const x = linearScale([ticks[0], ticks[ticks.length - 1]], [LABEL_W, W - 12])
  const height = TOP + rows.length * ROW_H + 6

  return (
    <div className={styles.chart}>
      {active !== null && (
        <ChartTooltip
          leftPct={(x(rows[active].max) / W) * 100}
          title={rows[active].label}
          value={`${rows[active].min}–${rows[active].max}${unit}`}
        />
      )}
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className={styles.svg}
        role='img'
        aria-label={ariaLabel}
      >
        {ticks.map((t) => (
          <text
            key={t}
            className={styles.axisText}
            x={x(t)}
            y={12}
            textAnchor='middle'
          >
            {t}
            {unit}
          </text>
        ))}
        {rows.map((r, i) => {
          const cy = TOP + i * ROW_H + ROW_H / 2
          return (
            <g key={r.label} data-flagged={r.flagged ? 'true' : undefined}>
              <text className={styles.axisText} x={0} y={cy + 4}>
                {r.label}
              </text>
              <rect
                x={x(r.min)}
                width={Math.max(4, x(r.max) - x(r.min))}
                y={cy - 5}
                height={10}
                rx={5}
                fill={r.flagged ? 'var(--danger)' : 'var(--gold-500)'}
                opacity={active === null || active === i ? 1 : 0.45}
              />
              <rect
                data-testid={`hit-${i}`}
                className={styles.hit}
                x={0}
                width={W}
                y={cy - ROW_H / 2}
                height={ROW_H}
                onClick={() => setActive(active === i ? null : i)}
              />
            </g>
          )
        })}
        {threshold && (
          <g>
            <line
              x1={x(threshold.value)}
              x2={x(threshold.value)}
              y1={TOP - 4}
              y2={height}
              stroke='var(--danger)'
              strokeWidth={1.5}
              strokeDasharray='4 3'
            />
            <text
              className={styles.refText}
              x={x(threshold.value) + 4}
              y={TOP + 8}
            >
              {threshold.label}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
