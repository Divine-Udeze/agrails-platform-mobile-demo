import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from '@/src/App'
import { ErrorBoundary } from '@/src/components/common/ErrorBoundary'
import { AUTH_KEY, STATE_KEY } from '@/src/context/persistence'

// The first screen crashes, as a page reading bad saved data would.
vi.mock('@/src/pages/onboarding/Welcome', () => ({
  default: () => {
    throw new Error('boom')
  },
}))

function Boom(): never {
  throw new Error('boom')
}

let quiet: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  // React logs caught render errors; keep the test output clean
  quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => quiet.mockRestore())

test('a crash shows Start again, which clears saved data and reloads', async () => {
  const user = userEvent.setup()
  localStorage.setItem(AUTH_KEY, '{"isAuthenticated":true}')
  localStorage.setItem(STATE_KEY, '{"farms":"broken"}')
  localStorage.setItem('other', 'kept')
  const reload = vi.fn()
  render(
    <ErrorBoundary reload={reload}>
      <Boom />
    </ErrorBoundary>,
  )
  expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Start again' }))
  expect(localStorage.getItem(AUTH_KEY)).toBeNull()
  expect(localStorage.getItem(STATE_KEY)).toBeNull()
  expect(localStorage.getItem('other')).toBe('kept')
  expect(reload).toHaveBeenCalledTimes(1)
})

test('the app catches a crashing page instead of going blank', async () => {
  render(<App />)
  expect(
    await screen.findByRole('button', { name: 'Start again' }),
  ).toBeInTheDocument()
})
