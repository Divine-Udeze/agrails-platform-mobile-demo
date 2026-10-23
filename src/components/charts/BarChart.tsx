import { useState } from 'react'
import { CHAR_W } from '@/src/components/charts/geometry'
import { ChartTooltip } from '@/src/components/charts/ChartTooltip'
import styles from '@/src/components/charts/charts.module.css'
import { linearScale, niceTicks } from '@/src/components/charts/scale'
import { TOKEN_HEX } from '@/src/components/common/statusColor'

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

const luminance = (hex: string) => {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const INK_L = luminance('#17201a')
/** true when white text reads better than ink on this bar colour (unknown colours get white) */
export function whiteOnBar(color = 'var(--green-500)'): boolean {
  const hex = TOKEN_HEX[color] ?? (/^#[0-9a-f]{6}$/i.test(color) ? color : null)
  if (!hex) return true
  const l = luminance(hex)
  return 1.05 / (l + 0.05) >= (l + 0.05) / (INK_L + 0.05)
}
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
  const refLineY = reference ? y(reference.value) : 0
  const refY = reference
    ? Math.max(2, Math.min(refLineY - 24, height - PAD.b - 20))
    : 0

  // showValues: place each value label, keeping it off the reference line
  // and the reference pill (the pill moves sideways/below if it must).
  const VALUE_H = 14
  const labels = showValues
    ? bars.map((b, i) => {
        const text = formatValue(b.value)
        const w = text.length * CHAR_W * (14 / 12)
        const top = y(Math.max(0, b.value))
        let ty = top - 6
        let placement: 'above' | 'inside' | 'below' = 'above'
        if (reference && refLineY >= ty - 14 && refLineY <= ty + 4) {
          if (height - PAD.b - top >= 28) {
            placement = 'inside'
            ty = top + 19
          } else {
            placement = 'below'
            ty = refLineY + 16
          }
        }
        return { text, w, ty, placement, x: cx(i) - w / 2 }
      })
    : []
  const hits = (
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
  ) =>
    a.x < b.x + b.w + 2 &&
    a.x + a.w + 2 > b.x &&
    a.y < b.y + b.h + 2 &&
    a.y + a.h + 2 > b.y
  const pillBox = (x: number, py: number) => ({ x, y: py, w: refW, h: 18 })
  const pillClear = (x: number, py: number) =>
    labels.every(
      (l) =>
        !hits(pillBox(x, py), {
          x: l.x,
          y: l.ty - VALUE_H + 2,
          w: l.w,
          h: VALUE_H,
        }),
    )
  const rightX = W - PAD.r - refW
  const leftX = padL + 4
  const belowY = Math.min(refLineY + 6, height - PAD.b - 20)
  let pillX = rightX
  let pillY = refY
  if (reference && showValues) {
    const found = [
      [rightX, refY],
      [leftX, refY],
      [rightX, belowY],
      [leftX, belowY],
    ].find(([px, py]) => pillClear(px, py))
    if (found) [pillX, pillY] = found
  }
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
              data-placement={labels[i].placement}
              className={`${styles.valueText} ${labels[i].placement === 'inside' && whiteOnBar(b.color) ? styles.valueTextInside : ''}`}
              x={cx(i)}
              y={labels[i].ty}
              textAnchor='middle'
            >
              {labels[i].text}
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
              x={pillX}
              y={pillY}
              width={refW}
              height={18}
              rx={9}
            />
            <text
              className={styles.refText}
              x={pillX + refW - 8}
              y={pillY + 13}
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
