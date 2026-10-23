import styles from '@/src/components/cards/cards.module.css'
import { t } from '@/src/i18n'
import { formatDate } from '@/src/utils/format'
import { nairobiMidnight } from '@/src/utils/insurance'

const DAY = 86_400_000

/** Whole days between two UTC-midnight dates, from `today` (the Nairobi date). */
function days(start: string, end: string, today: Date) {
  const s = Date.parse(start)
  const e = Date.parse(end)
  const now = nairobiMidnight(today)
  return {
    untilStart: Math.round((s - now) / DAY),
    untilEnd: Math.round((e - now) / DAY),
    total: Math.round((e - s) / DAY) + 1,
    sinceStart: Math.round((now - s) / DAY),
  }
}

export function coverageText(
  start: string,
  end: string,
  today: Date = new Date(),
): string {
  const d = days(start, end, today)
  if (d.untilStart > 1) return t('policy.startsIn', { n: d.untilStart })
  if (d.untilStart === 1) return t('policy.startsTomorrow')
  if (d.untilEnd > 1) return t('policy.daysLeft', { n: d.untilEnd })
  if (d.untilEnd === 1) return t('policy.dayLeft')
  if (d.untilEnd === 0) return t('policy.lastDay')
  return t('policy.ended', { date: formatDate(end) })
}

/** Share of the cover days that have started, 0 to 1 (the whole of today counts). */
export function coverageProgress(
  start: string,
  end: string,
  today: Date = new Date(),
): number {
  const d = days(start, end, today)
  if (d.total <= 0) return 0
  return Math.min(1, Math.max(0, (d.sinceStart + 1) / d.total))
}

export function CoverageBar({
  start,
  end,
  today = new Date(),
}: {
  start: string
  end: string
  today?: Date
}) {
  const progress = coverageProgress(start, end, today)
  const text = coverageText(start, end, today)
  return (
    <div>
      <div className={styles.coverText}>{text}</div>
      <div
        className={styles.coverTrack}
        role='progressbar'
        aria-label={t('policy.coverage')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuetext={text}
      >
        <div
          className={styles.coverFill}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      <div className={styles.coverDates}>
        <span>{formatDate(start)}</span>
        <span>{formatDate(end)}</span>
      </div>
    </div>
  )
}
