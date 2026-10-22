import { act, render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  AppProvider,
  useApp,
  useFarm,
  useFarmForm,
  usePolicyForFarm,
} from '@/src/context/AppContext'
import { STATE_KEY } from '@/src/context/persistence'
import { seededState } from '@/src/test/renderWithApp'

const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider initialState={seededState()}>{children}</AppProvider>
)

test('hooks read slices of state', () => {
  const { result } = renderHook(
    () => ({
      farm: useFarm('farm-maize'),
      policy: usePolicyForFarm('farm-tea'),
    }),
    { wrapper },
  )
  expect(result.current.farm?.name).toBe('Lower Shamba')
  expect(result.current.policy).toBeUndefined()
})

test('usePolicyForFarm prefers the active policy', () => {
  const { result } = renderHook(() => usePolicyForFarm('farm-maize'), {
    wrapper,
  })
  expect(result.current?.status).toBe('active')
})

test('state changes are persisted', () => {
  const { result } = renderHook(
    () => ({ app: useApp(), form: useFarmForm() }),
    { wrapper },
  )
  act(() => result.current.form.update({ name: 'Kitchen garden' }))
  expect(localStorage.getItem(STATE_KEY)).toContain('Kitchen garden')
})

test('useApp outside the provider throws a helpful error', () => {
  const Broken = () => {
    useApp()
    return null
  }
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => render(<Broken />)).toThrow(/AppProvider/)
  vi.restoreAllMocks()
})

test('provider renders children', () => {
  render(<AppProvider>hello</AppProvider>)
  expect(screen.getByText('hello')).toBeInTheDocument()
})
