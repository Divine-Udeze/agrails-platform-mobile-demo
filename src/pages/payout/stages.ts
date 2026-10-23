import { useEffect } from 'react'
import type { TimelineStep } from '@/src/components/common/ProgressTimeline'
import { useApp } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import type { Payout, PayoutStage } from '@/src/types'
import { formatDate } from '@/src/utils/format'

export const PAYOUT_STAGES: PayoutStage[] = [
  'triggered',
  'assessed',
  'approved',
  'sent',
]

export function stageSteps(payout: Payout): {
  steps: TimelineStep[]
  currentIndex: number
} {
  const idx = PAYOUT_STAGES.indexOf(payout.stage)
  return {
    steps: PAYOUT_STAGES.map((s) => ({
      key: s,
      label: t(`payout.stage.${s}`),
      date: payout.stageDates[s]
        ? formatDate(payout.stageDates[s]!)
        : undefined,
    })),
    // an unrecognised stage leaves every step pending, with none current
    currentIndex: idx < 0 ? -1 : idx + 1,
  }
}

/** ISO date of the payout's most recent stage, '' when it has none. */
export function latestDate(payout: Payout): string {
  const latest = [...PAYOUT_STAGES].reverse().find((s) => payout.stageDates[s])
  return latest ? payout.stageDates[latest]! : ''
}

/** Marks a payout read once it is opened (depends on primitives so it cannot loop). */
export function useMarkPayoutRead(payout: Payout | undefined) {
  const { dispatch } = useApp()
  const id = payout?.id
  const read = payout?.read
  useEffect(() => {
    if (id && read === false) {
      dispatch({ type: 'MARK_PAYOUT_READ', payoutId: id })
    }
  }, [id, read, dispatch])
}
