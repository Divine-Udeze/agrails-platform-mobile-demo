import styles from '@/src/components/charts/charts.module.css'
import { clamp } from '@/src/components/charts/scale'

export function ChartTooltip({
  leftPct,
  title,
  value,
}: {
  leftPct: number
  title: string
  value: string
}) {
  return (
    <div
      className={styles.tooltip}
      style={{ left: `${clamp(leftPct, 14, 86)}%` }}
      role='status'
    >
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  )
}
