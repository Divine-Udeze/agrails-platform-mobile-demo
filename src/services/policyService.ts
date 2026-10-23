import { delay, newId, serviceConfig } from '@/src/services/config'
import type { Farm, PlanId, Policy, Quote } from '@/src/types'
import { buildQuote } from '@/src/utils/insurance'

export async function getQuote(farm: Farm, planId: PlanId): Promise<Quote> {
  await delay(serviceConfig.latencyMs)
  return buildQuote(farm, planId)
}

export async function createPolicy(
  quote: Quote,
  mpesaReceipt: string,
): Promise<Policy> {
  await delay(serviceConfig.latencyMs)
  const serial = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
  return {
    id: newId('policy'),
    policyNumber: `AGR-${new Date().getUTCFullYear()}-${serial}`,
    farmId: quote.farmId,
    planId: quote.planId,
    sumInsuredKES: quote.sumInsuredKES,
    premiumKES: quote.premiumKES,
    subsidyKES: quote.subsidyKES,
    farmerPremiumKES: quote.farmerPremiumKES,
    triggerYieldPct: quote.triggerYieldPct,
    coverageStart: quote.coverageStart,
    coverageEnd: quote.coverageEnd,
    status: 'active',
    mpesaReceipt,
  }
}
