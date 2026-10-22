import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { serviceConfig } from '@/src/services/config'

serviceConfig.latencyMs = 0
serviceConfig.paymentMs = 0
serviceConfig.paymentTimeoutMs = 0

afterEach(() => {
  localStorage.clear()
})

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
