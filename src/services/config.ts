export const serviceConfig = {
  latencyMs: 600,
  paymentMs: 4000,
  paymentTimeoutMs: 60000,
}

export function delay(ms: number): Promise<void> {
  return ms <= 0
    ? Promise.resolve()
    : new Promise((resolve) => setTimeout(resolve, ms))
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
