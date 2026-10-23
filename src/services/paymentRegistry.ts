import type { Policy } from '@/src/types'

export type PaymentOutcome =
  | { status: 'success'; policy: Policy }
  | { status: 'failed' | 'timeout' }
  /** money was taken but the policy could not be created */
  | { status: 'issue' }
  /** the farm already had an active policy, so nobody was charged */
  | { status: 'blocked' }

// One payment per farm at a time, owned outside any component: leaving the
// page, or tapping Close, never abandons a payment that may take money.
const pending = new Map<string, Promise<PaymentOutcome>>()
/** what a page needs to show a running payment after returning to it */
export interface PaymentInfo {
  amountKES: number
  startedAt: number
}
const infos = new Map<string, PaymentInfo>()
// Payments that took money without producing a policy, until acknowledged.
const issues = new Set<string>()
// Farms whose policy was just created: ADD_POLICY may not have committed yet,
// so a new payment must not start until a page has seen the active policy.
const paid = new Set<string>()
// Bumped on login/logout: a payment from an old session records nothing.
let session = 0
export const paymentSession = () => session

export function pendingPayment(farmId: string) {
  return pending.get(farmId)
}

export const pendingInfo = (farmId: string) => infos.get(farmId)

export function startPayment(
  farmId: string,
  amountKES: number,
  run: () => Promise<PaymentOutcome>,
): Promise<PaymentOutcome> {
  const existing = pending.get(farmId)
  if (existing) return existing
  if (paid.has(farmId)) return Promise.resolve({ status: 'blocked' })
  const token = session
  const promise: Promise<PaymentOutcome> = run()
    .catch((): PaymentOutcome => ({ status: 'issue' }))
    .then((outcome) => {
      if (token !== session) return outcome
      if (pending.get(farmId) === promise) {
        pending.delete(farmId)
        infos.delete(farmId)
      }
      if (outcome.status === 'issue') issues.add(farmId)
      return outcome
    })
  pending.set(farmId, promise)
  infos.set(farmId, { amountKES, startedAt: Date.now() })
  return promise
}

export const hasPaymentIssue = (farmId: string) => issues.has(farmId)
export const clearPaymentIssue = (farmId: string) => {
  issues.delete(farmId)
}

export const markPaymentRecorded = (farmId: string) => {
  paid.add(farmId)
}
export const clearPaymentRecorded = (farmId: string) => {
  paid.delete(farmId)
}

/** Call on login and logout: forget every payment of the previous session. */
export function resetPaymentSession() {
  session += 1
  pending.clear()
  infos.clear()
  issues.clear()
  paid.clear()
}

/** test-only */
export const __resetPayments = resetPaymentSession
