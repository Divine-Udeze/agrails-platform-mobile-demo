import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import { afterEach } from 'vitest'
import { serviceConfig } from '@/src/services/config'

// Lazy route chunks can take >1s to load under CPU load.
configure({ asyncUtilTimeout: 5000 })

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

window.scrollTo = (() => {}) as typeof window.scrollTo
