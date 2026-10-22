import { delay, serviceConfig } from '@/src/services/config'

export type PaymentResult =
  | { status: 'success'; receipt: string }
  | { status: 'failed' }
  | { status: 'timeout' }

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'

function receiptCode(): string {
  let code = 'S'
  for (let i = 0; i < 9; i++)
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return code
}

/**
 * Simulated M-Pesa STK push. Numbers ending in 0 are declined,
 * numbers ending in 9 never answer (timeout), all others succeed.
 */
export async function requestMpesaPayment(
  phone: string,
  _amountKES: number,
): Promise<PaymentResult> {
  const lastDigit = phone.slice(-1)
  if (lastDigit === '9') {
    await delay(serviceConfig.paymentTimeoutMs)
    return { status: 'timeout' }
  }
  await delay(serviceConfig.paymentMs)
  if (lastDigit === '0') return { status: 'failed' }
  return { status: 'success', receipt: receiptCode() }
}
