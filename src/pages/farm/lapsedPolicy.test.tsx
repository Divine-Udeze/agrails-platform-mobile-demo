import { screen, within } from '@testing-library/react'
import FarmDetail from '@/src/pages/farm/FarmDetail'
import Home from '@/src/pages/farm/Home'
import PlanOptions from '@/src/pages/insurance/PlanOptions'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

/** Wanjiru's maize policy is still stored as 'active', but its cover ended yesterday. */
function lapsedMaize() {
  const state = seededState()
  const yesterday = new Date(Date.now() - 2 * 86_400_000).toISOString()
  return {
    ...state,
    policies: state.policies.map((p) =>
      p.farmId === 'farm-maize'
        ? { ...p, status: 'active' as const, coverageEnd: yesterday }
        : p,
    ),
  }
}

test('Home does not count a policy whose cover has ended', () => {
  renderWithApp(<Home />, {
    route: '/home',
    path: '/home',
    state: lapsedMaize(),
  })
  expect(screen.getByText('0 ha of 4 ha insured')).toBeInTheDocument()
  const card = screen.getByRole('link', { name: /^Lower Shamba/ })
  expect(within(card).getByText('Not insured')).toBeInTheDocument()
  expect(within(card).queryByText('Insured')).not.toBeInTheDocument()
})

test('FarmDetail offers insurance once the cover has ended', () => {
  renderWithApp(<FarmDetail />, {
    route: '/farm/farm-maize',
    path: '/farm/:farmId',
    state: lapsedMaize(),
  })
  expect(screen.getByText('Protect this farm')).toBeInTheDocument()
  expect(screen.queryByText('Active')).not.toBeInTheDocument()
})

test('PlanOptions shows plans for a farm whose cover has ended', async () => {
  renderWithApp(<PlanOptions />, {
    route: '/insure/farm-maize',
    path: '/insure/:farmId',
    state: lapsedMaize(),
  })
  expect(await screen.findAllByRole('radio')).toHaveLength(3)
  expect(
    screen.queryByText('This farm is already insured'),
  ).not.toBeInTheDocument()
})
