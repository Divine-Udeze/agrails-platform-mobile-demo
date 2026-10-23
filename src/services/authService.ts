import { buildAccounts, MOCK_OTP, type SeedData } from '@/src/data/mockData'
import { delay, newId, serviceConfig } from '@/src/services/config'
import type { Crop, Farmer } from '@/src/types'
import { isValidNationalId } from '@/src/utils/validation'

export async function sendOtp(_phone: string): Promise<{ hint: string }> {
  await delay(serviceConfig.latencyMs)
  return { hint: MOCK_OTP }
}

export type VerifyResult =
  | { ok: false }
  | { ok: true; isNewUser: true }
  | { ok: true; isNewUser: false; data: SeedData }

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<VerifyResult> {
  await delay(serviceConfig.latencyMs)
  if (code !== MOCK_OTP) return { ok: false }
  const account = buildAccounts().find((a) => a.farmer.phone === phone)
  if (account) return { ok: true, isNewUser: false, data: account }
  return { ok: true, isNewUser: true }
}

export type LookupType = 'policy' | 'id'

export function normalizePolicyNumber(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Finds the existing policyholder for a policy number or national ID.
 * Returns only the phone on file — the caller must confirm it with an OTP.
 */
export async function findPolicyholder(
  type: LookupType,
  value: string,
): Promise<{ phone: string } | null> {
  await delay(serviceConfig.latencyMs)
  const accounts = buildAccounts()
  if (type === 'id') {
    const id = value.trim()
    if (!isValidNationalId(id)) return null
    const match = accounts.find((a) => a.farmer.nationalId === id)
    return match ? { phone: match.farmer.phone } : null
  }
  const wanted = normalizePolicyNumber(value)
  if (!wanted) return null
  const match = accounts.find((a) =>
    a.policies.some((p) => normalizePolicyNumber(p.policyNumber) === wanted),
  )
  return match ? { phone: match.farmer.phone } : null
}

export async function register(input: {
  phone: string
  name: string
  county: string
  nationalId: string
  primaryCrop: Crop
}): Promise<Farmer> {
  await delay(serviceConfig.latencyMs)
  return {
    id: newId('farmer'),
    ...input,
    name: input.name.trim(),
    nationalId: input.nationalId.trim(),
  }
}
