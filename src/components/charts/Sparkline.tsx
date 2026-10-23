import styles from '@/src/components/charts/charts.module.css'
import { extent, linearScale } from '@/src/components/charts/scale'
import type { Status } from '@/src/types'

interface Props {
  values: number[]
  label: string
  status?: Status
  width?: number
  height?: number
}

export function Sparkline({
  values,
  label,
  status = 'good',
  width = 96,
  height = 32,
}: Props) {
  if (values.length < 2) return null
  const [lo, hi] = extent(values, 0.1)
  const x = linearScale([0, values.length - 1], [3, width - 5])
  const y = linearScale([lo, hi], [height - 4, 4])
  const points = values
    .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(' ')
  const lastX = x(values.length - 1)
  const lastY = y(values[values.length - 1])
  return (
    <svg
      className={styles[status]}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role='img'
      aria-label={label}
      data-status={status}
    >
      <polyline
        points={points}
        fill='none'
        stroke='currentColor'
        strokeWidth={2.5}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <circle cx={lastX} cy={lastY} r={3.5} fill='currentColor' />
    </svg>
  )
}
