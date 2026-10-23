import type { PolicyStatus } from '@/src/types'
import { displayStatus } from '@/src/utils/policy'

export { displayStatus, policyChipStatus } from '@/src/utils/policy'

interface PolicyDates {
  status: PolicyStatus
  coverageStart: string
  coverageEnd: string
}

/** Active (by display status) first, then the newest start date first. */
export function sortPolicies<P extends PolicyDates>(
  policies: P[],
  today: Date = new Date(),
): P[] {
  const live = (p: P) => Number(displayStatus(p, today) === 'active')
  return [...policies].sort(
    (a, b) =>
      live(b) - live(a) || b.coverageStart.localeCompare(a.coverageStart),
  )
}
