import { useState } from 'react'
import { CHAR_W } from '@/src/components/charts/geometry'
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
  /** draw each bar's formatted value above it (replaces the y-axis tick labels) */
  showValues?: boolean
}

const W = 320
const PAD = { l: 36, r: 12, t: 22, b: 26 }

export function BarChart({
  bars,
  formatValue,
  ariaLabel,
  reference,
  height = 190,
  showValues = false,
}: Props) {
  const [active, setActive] = useState<number | null>(null)
  const n = bars.length
  const maxVal = Math.max(...bars.map((b) => b.value), reference?.value ?? 0)
  const ticks = niceTicks(0, maxVal || 1, 4)
  const hi = ticks[ticks.length - 1]
  const tickLabels = ticks.map((v) => formatValue(v))
  const padL = showValues
    ? PAD.r
    : Math.max(
        PAD.l,
        Math.ceil(Math.max(...tickLabels.map((s) => s.length)) * CHAR_W) + 12,
      )
  const y = linearScale([0, hi], [height - PAD.b, PAD.t])
  const slot = (W - padL - PAD.r) / Math.max(1, n)
  const barW = slot * 0.62
  const cx = (i: number) => padL + slot * i + slot / 2
  const refW = reference ? Math.ceil(reference.label.length * CHAR_W) + 16 : 0
  const refY = reference
    ? Math.max(2, Math.min(y(reference.value) - 24, height - PAD.b - 20))
    : 0
  const labelW = Math.max(0, ...bars.map((b) => b.label.length)) * CHAR_W + 8
  const every = Math.max(1, Math.ceil(labelW / slot))

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
        {ticks.map((t, ti) => (
          <g key={t}>
            <line
              className={styles.gridLine}
              x1={padL}
              x2={W - PAD.r}
              y1={y(t)}
              y2={y(t)}
            />
            {!showValues && (
              <text
                className={styles.axisText}
                x={padL - 6}
                y={y(t) + 4}
                textAnchor='end'
              >
                {tickLabels[ti]}
              </text>
            )}
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
        {showValues &&
          bars.map((b, i) => (
            <text
              key={b.label}
              data-value={b.label}
              className={styles.valueText}
              x={cx(i)}
              y={y(Math.max(0, b.value)) - 6}
              textAnchor='middle'
            >
              {formatValue(b.value)}
            </text>
          ))}
        {reference && (
          <g>
            <line
              x1={padL}
              x2={W - PAD.r}
              y1={y(reference.value)}
              y2={y(reference.value)}
              stroke='var(--ink-2)'
              strokeWidth={2}
              strokeDasharray='6 4'
            />
            <rect
              data-testid='ref-pill'
              className={styles.refPill}
              x={W - PAD.r - refW}
              y={refY}
              width={refW}
              height={18}
              rx={9}
            />
            <text
              className={styles.refText}
              x={W - PAD.r - 8}
              y={refY + 13}
              textAnchor='end'
            >
              {reference.label}
            </text>
          </g>
        )}
        {bars.map((b, i) =>
          i === n - 1 || (i % every === 0 && n - 1 - i >= every) ? (
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
