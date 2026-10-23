import { useId, useState } from 'react'
import { ChartTooltip } from '@/src/components/charts/ChartTooltip'
import styles from '@/src/components/charts/charts.module.css'
import {
  extent,
  linearScale,
  niceTicks,
  svgId,
} from '@/src/components/charts/scale'

interface Props {
  values: number[]
  labels: string[]
  formatValue: (v: number) => string
  ariaLabel: string
  yDomain?: [number, number]
  band?: { from: number; to: number; label: string }
  markerIndex?: number
  markerLabel?: string
  color?: string
  height?: number
}

const W = 320
const PAD = { l: 36, r: 12, t: 28, b: 26 }

export function LineChart({
  values,
  labels,
  formatValue,
  ariaLabel,
  yDomain,
  band,
  markerIndex,
  markerLabel,
  color = 'var(--green-700)',
  height = 190,
}: Props) {
  const [active, setActive] = useState<number | null>(null)
  const gradientId = svgId(`area${useId()}`)
  const n = values.length
  const [lo0, hi0] =
    yDomain ?? extent([...values, ...(band ? [band.from, band.to] : [])], 0.1)
  const ticks = niceTicks(lo0, hi0, 4)
  const lo = ticks[0]
  const hi = ticks[ticks.length - 1]
  const x = linearScale([0, Math.max(1, n - 1)], [PAD.l, W - PAD.r])
  const y = linearScale([lo, hi], [height - PAD.b, PAD.t])
  const line = values
    .map((v, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(' ')
  const area = `${line} L ${x(n - 1).toFixed(1)} ${y(lo)} L ${x(0).toFixed(1)} ${y(lo)} Z`
  const step = n > 1 ? x(1) - x(0) : W
  const labelIdx =
    n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : [...Array(n).keys()]

  return (
    <div className={styles.chart}>
      {active !== null && (
        <ChartTooltip
          leftPct={(x(active) / W) * 100}
          title={labels[active]}
          value={formatValue(values[active])}
        />
      )}
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className={styles.svg}
        role='img'
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={gradientId} x1='0' x2='0' y1='0' y2='1'>
            <stop offset='0%' stopColor={color} stopOpacity={0.28} />
            <stop offset='100%' stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
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
        {band && (
          <g>
            <rect
              x={PAD.l}
              width={W - PAD.l - PAD.r}
              y={y(Math.min(hi, band.to))}
              height={Math.max(
                0,
                y(Math.max(lo, band.from)) - y(Math.min(hi, band.to)),
              )}
              fill='var(--green-100)'
              opacity={0.8}
            />
            <text
              className={styles.refText}
              x={W - PAD.r - 4}
              y={y(Math.min(hi, band.to)) + 14}
              textAnchor='end'
            >
              {band.label}
            </text>
          </g>
        )}
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill='none'
          stroke={color}
          strokeWidth={3}
          strokeLinejoin='round'
          strokeLinecap='round'
        />
        {markerIndex !== undefined && markerIndex < n && (
          <g>
            <line
              x1={x(markerIndex)}
              x2={x(markerIndex)}
              y1={PAD.t - 8}
              y2={height - PAD.b}
              stroke='var(--gold-500)'
              strokeWidth={2}
              strokeDasharray='4 4'
            />
            <circle
              cx={x(markerIndex)}
              cy={y(values[markerIndex])}
              r={6}
              fill='var(--gold-500)'
              stroke='#fff'
              strokeWidth={2}
            />
            {markerLabel && (
              <text
                className={styles.refText}
                x={x(markerIndex)}
                y={PAD.t - 12}
                textAnchor='end'
              >
                {markerLabel}
              </text>
            )}
          </g>
        )}
        {active !== null && (
          <circle
            cx={x(active)}
            cy={y(values[active])}
            r={6}
            fill={color}
            stroke='#fff'
            strokeWidth={2}
          />
        )}
        {labelIdx.map((i) => (
          <text
            key={i}
            className={styles.axisText}
            x={x(i)}
            y={height - 6}
            textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
          >
            {labels[i]}
          </text>
        ))}
        {values.map((_, i) => (
          <rect
            key={i}
            data-testid={`hit-${i}`}
            className={styles.hit}
            x={x(i) - step / 2}
            width={step}
            y={PAD.t}
            height={height - PAD.t - PAD.b}
            onClick={() => setActive(active === i ? null : i)}
          />
        ))}
      </svg>
    </div>
  )
}
