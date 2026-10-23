import { useState } from 'react'
import { ChartTooltip } from '@/src/components/charts/ChartTooltip'
import styles from '@/src/components/charts/charts.module.css'
import { linearScale, niceTicks } from '@/src/components/charts/scale'

export interface Bar {
  label: string
  value: number
  color?: string
  highlight?: boolean
}

interface Props {
  bars: Bar[]
  formatValue: (v: number) => string
  ariaLabel: string
  reference?: { value: number; label: string }
  height?: number
}

const W = 320
const PAD = { l: 36, r: 12, t: 22, b: 26 }

export function BarChart({
  bars,
  formatValue,
  ariaLabel,
  reference,
  height = 190,
}: Props) {
  const [active, setActive] = useState<number | null>(null)
  const n = bars.length
  const maxVal = Math.max(...bars.map((b) => b.value), reference?.value ?? 0)
  const ticks = niceTicks(0, maxVal || 1, 4)
  const hi = ticks[ticks.length - 1]
  const y = linearScale([0, hi], [height - PAD.b, PAD.t])
  const slot = (W - PAD.l - PAD.r) / Math.max(1, n)
  const barW = slot * 0.62
  const cx = (i: number) => PAD.l + slot * i + slot / 2
  const every = Math.ceil(n / 8)

  return (
    <div className={styles.chart}>
      {active !== null && (
        <ChartTooltip
          leftPct={(cx(active) / W) * 100}
          title={bars[active].label}
          value={formatValue(bars[active].value)}
        />
      )}
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className={styles.svg}
        role='img'
        aria-label={ariaLabel}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              className={styles.gridLine}
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(t)}
              y2={y(t)}
            />
            <text
              className={styles.axisText}
              x={PAD.l - 6}
              y={y(t) + 4}
              textAnchor='end'
            >
              {formatValue(t)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          const top = y(Math.max(0, b.value))
          return (
            <rect
              key={b.label}
              data-bar={b.label}
              data-highlight={b.highlight ? 'true' : undefined}
              x={cx(i) - barW / 2}
              width={barW}
              y={top}
              height={Math.max(0, height - PAD.b - top)}
              rx={4}
              fill={b.color ?? 'var(--green-500)'}
              opacity={active === null || active === i ? 1 : 0.45}
              stroke={b.highlight ? 'var(--ink)' : undefined}
              strokeWidth={b.highlight ? 1.5 : undefined}
            />
          )
        })}
        {reference && (
          <g>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(reference.value)}
              y2={y(reference.value)}
              stroke='var(--ink-2)'
              strokeWidth={2}
              strokeDasharray='6 4'
            />
            <text
              className={styles.refText}
              x={W - PAD.r}
              y={y(reference.value) - 6}
              textAnchor='end'
            >
              {reference.label}
            </text>
          </g>
        )}
        {bars.map((b, i) =>
          i % every === 0 || i === n - 1 ? (
            <text
              key={b.label}
              className={styles.axisText}
              x={cx(i)}
              y={height - 6}
              textAnchor='middle'
            >
              {b.label}
            </text>
          ) : null,
        )}
        {bars.map((b, i) => (
          <rect
            key={b.label}
            data-testid={`hit-${i}`}
            className={styles.hit}
            x={cx(i) - slot / 2}
            width={slot}
            y={PAD.t}
            height={height - PAD.t - PAD.b}
            onClick={() => setActive(active === i ? null : i)}
          />
        ))}
      </svg>
    </div>
  )
}
