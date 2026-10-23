import { useId, useState } from 'react'
import { CHAR_W } from '@/src/components/charts/geometry'
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

/**
 * Header label for the marker: anchored to the marker's x (end-aligned in the
 * right third, start-aligned in the left third, centred otherwise), clamped to
 * the chart. If that would run into the band key, it moves to the right edge.
 */
function placeMarkerLabel(mx: number, w: number, keyEnd: number) {
  const frac = (mx - PAD.l) / (W - PAD.l - PAD.r)
  const anchor = frac > 2 / 3 ? 'end' : frac < 1 / 3 ? 'start' : 'middle'
  const x =
    anchor === 'end'
      ? Math.min(W, Math.max(w, mx))
      : anchor === 'start'
        ? Math.max(0, Math.min(W - w, mx))
        : Math.max(w / 2, Math.min(W - w / 2, mx))
  const left = anchor === 'end' ? x - w : anchor === 'start' ? x : x - w / 2
  if (left < keyEnd) return { x: W - PAD.r, anchor: 'end' as const }
  return { x, anchor: anchor as 'start' | 'middle' | 'end' }
}

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

  const todayLabel =
    markerIndex !== undefined && markerIndex < n && markerLabel
      ? placeMarkerLabel(
          x(markerIndex),
          Math.ceil(markerLabel.length * CHAR_W),
          band ? PAD.l + 20 + Math.ceil(band.label.length * CHAR_W) + 8 : 0,
        )
      : null

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
        {(band || (markerIndex !== undefined && markerLabel)) && (
          <g data-testid='chart-header'>
            {band && (
              <>
                <rect
                  data-testid='band-key'
                  x={PAD.l}
                  y={5}
                  width={14}
                  height={12}
                  rx={3}
                  fill='var(--green-100)'
                  stroke='var(--green-300)'
                />
                <text
                  className={styles.refText}
                  x={PAD.l + 20}
                  y={16}
                  textAnchor='start'
                >
                  {band.label}
                </text>
              </>
            )}
            {todayLabel && (
              <text
                data-testid='marker-label'
                className={styles.refText}
                x={todayLabel.x}
                y={16}
                textAnchor={todayLabel.anchor}
              >
                {markerLabel}
              </text>
            )}
          </g>
        )}
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
          </g>
        )}
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          data-testid='line-path'
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
              y1={PAD.t - 4}
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
        <rect
          data-testid='plot-hit'
          className={styles.hit}
          x={0}
          width={W}
          y={0}
          height={height - PAD.b}
          onClick={(e) => {
            const box = e.currentTarget.getBoundingClientRect()
            if (!box.width) return
            const px = ((e.clientX - box.left) / box.width) * W
            const i = Math.min(
              n - 1,
              Math.max(0, Math.round((px - PAD.l) / (step || 1))),
            )
            setActive(active === i ? null : i)
          }}
        />
      </svg>
    </div>
  )
}
