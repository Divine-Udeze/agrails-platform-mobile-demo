import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import PlanOptions, { TriggerBar } from '@/src/pages/insurance/PlanOptions'
import PremiumQuote from '@/src/pages/insurance/PremiumQuote'
import { planFromSearch, useQuotes } from '@/src/pages/insurance/useQuote'
import * as policyService from '@/src/services/policyService'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'
import { buildQuote } from '@/src/utils/insurance'
import { formatKES } from '@/src/utils/format'
import type { Farm, PlanId, Quote } from '@/src/types'

afterEach(() => vi.restoreAllMocks())

const optionsAt = (id: string) => ({
  route: `/insure/${id}`,
  path: '/insure/:farmId',
  state: seededState(),
})
const quoteAt = (id: string, plan = 'standard') => ({
  route: `/premium-quote/${id}?plan=${plan}`,
  path: '/premium-quote/:farmId',
  state: seededState(),
})
const farmOf = (id: string): Farm => {
  const f = seededState().farms.find((x) => x.id === id)
  if (!f) throw new Error('no farm')
  return f
}

test('planFromSearch falls back to the recommended plan', () => {
  expect(planFromSearch(new URLSearchParams('plan=premium'))).toBe('premium')
  expect(planFromSearch(new URLSearchParams('plan=gold'))).toBe('standard')
  expect(planFromSearch(new URLSearchParams(''))).toBe('standard')
})

test('useQuotes drops stale quotes when the plan changes', async () => {
  const farm = farmOf('farm-tea')
  const { result, rerender } = renderHook(
    ({ plans }) => useQuotes(farm, plans),
    { initialProps: { plans: ['basic'] as PlanId[] } },
  )
  await waitFor(() => expect(result.current.quotes?.[0].planId).toBe('basic'))
  let release: (q: Quote) => void = () => {}
  vi.spyOn(policyService, 'getQuote').mockReturnValue(
    new Promise<Quote>((res) => {
      release = res
    }),
  )
  rerender({ plans: ['premium'] })
  expect(result.current.quotes).toBeNull()
  release({ planId: 'premium' } as Quote)
  await waitFor(() => expect(result.current.quotes?.[0].planId).toBe('premium'))
})

test('useQuotes surfaces a rejection and recovers on retry', async () => {
  const farm = farmOf('farm-tea')
  vi.spyOn(policyService, 'getQuote').mockRejectedValueOnce(new Error('x'))
  const { result } = renderHook(() => useQuotes(farm, ['standard']))
  await waitFor(() => expect(result.current.error).toBe(true))
  expect(result.current.quotes).toBeNull()
  act(() => result.current.retry())
  await waitFor(() => expect(result.current.quotes).toHaveLength(1))
  expect(result.current.error).toBe(false)
})

test('plan options list three plans with standard preselected', async () => {
  const { user } = renderWithApp(<PlanOptions />, optionsAt('farm-tea'))
  const radios = await screen.findAllByRole('radio')
  expect(radios).toHaveLength(3)
  expect(screen.getByRole('radio', { name: /standard/i })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  expect(screen.getByText('Most popular')).toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: /premium/i }))
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByTestId('location')).toHaveTextContent(
    '/premium-quote/farm-tea?plan=premium',
  )
})

test('plan options show an error with retry, then the plans', async () => {
  vi.spyOn(policyService, 'getQuote').mockRejectedValueOnce(new Error('x'))
  const { user } = renderWithApp(<PlanOptions />, optionsAt('farm-tea'))
  await user.click(await screen.findByRole('button', { name: 'Try again' }))
  expect(await screen.findAllByRole('radio')).toHaveLength(3)
})

test('an insured farm is not sold a second policy', async () => {
  renderWithApp(<PlanOptions />, optionsAt('farm-maize'))
  expect(
    await screen.findByText('This farm is already insured'),
  ).toBeInTheDocument()
  expect(screen.queryAllByRole('radio')).toHaveLength(0)
})

test('plan options for an unknown farm shows Not Found', () => {
  renderWithApp(<PlanOptions />, optionsAt('nope'))
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})

test('premium quote shows the split, the example payout and the pay button', async () => {
  const { user } = renderWithApp(<PremiumQuote />, quoteAt('farm-tea'))
  // tea: 2 ha x 300,000 x 0.7 = 420,000 cover; medium risk 7% = 29,400; farmer pays 14,700
  expect(await screen.findByText('You pay KES 14,700')).toBeInTheDocument()
  expect(
    screen.getByRole('img', { name: 'Who pays the premium' }),
  ).toBeInTheDocument()
  expect(screen.getByText(/you receive about KES 120,000/)).toBeInTheDocument()
  await user.click(
    screen.getByRole('button', { name: 'Pay KES\u00a014,700 with M-Pesa' }),
  )
  expect(screen.getByTestId('location')).toHaveTextContent(
    '/payment/farm-tea?plan=standard',
  )
})

test('premium quote with a bad plan falls back to standard', async () => {
  renderWithApp(<PremiumQuote />, quoteAt('farm-tea', 'gold'))
  expect(await screen.findByText('You pay KES 14,700')).toBeInTheDocument()
})

test('premium quote shows an error with retry', async () => {
  vi.spyOn(policyService, 'getQuote').mockRejectedValueOnce(new Error('x'))
  const { user } = renderWithApp(<PremiumQuote />, quoteAt('farm-tea'))
  await user.click(await screen.findByRole('button', { name: 'Try again' }))
  expect(await screen.findByText('You pay KES 14,700')).toBeInTheDocument()
})

test('premium quote deep link for an insured farm cannot reach Pay', async () => {
  renderWithApp(<PremiumQuote />, quoteAt('farm-maize'))
  expect(
    await screen.findByText('This farm is already insured'),
  ).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Pay/ })).toBeNull()
})

test('plan cards show the real price and cover for each plan', async () => {
  renderWithApp(<PlanOptions />, optionsAt('farm-tea'))
  const radios = await screen.findAllByRole('radio')
  const tea = farmOf('farm-tea')
  const plans: PlanId[] = ['basic', 'standard', 'premium']
  plans.forEach((plan, i) => {
    const q = buildQuote(tea, plan)
    // textContent keeps the non-breaking space that formatKES emits
    expect(radios[i].textContent).toContain(formatKES(q.farmerPremiumKES))
    expect(radios[i].textContent).toContain(
      `Cover up to ${formatKES(q.sumInsuredKES)}`,
    )
  })
  // tea, medium risk: standard is 420,000 cover and 14,700 for the farmer
  expect(radios[1]).toHaveTextContent('KES 14,700')
  expect(radios[1]).toHaveTextContent('KES 420,000')
})

test('the plan from the URL is preselected so Back keeps the choice', async () => {
  renderWithApp(<PlanOptions />, {
    ...optionsAt('farm-tea'),
    route: '/insure/farm-tea?plan=premium',
  })
  expect(
    await screen.findByRole('radio', { name: /premium/i }),
  ).toHaveAttribute('aria-checked', 'true')
})

test('arrow keys move the selection and focus with a roving tabindex', async () => {
  const { user } = renderWithApp(<PlanOptions />, optionsAt('farm-tea'))
  const standard = await screen.findByRole('radio', { name: /standard/i })
  expect(standard).toHaveAttribute('tabindex', '0')
  expect(screen.getByRole('radio', { name: /basic/i })).toHaveAttribute(
    'tabindex',
    '-1',
  )
  standard.focus()
  await user.keyboard('{ArrowDown}')
  const premium = screen.getByRole('radio', { name: /premium/i })
  expect(premium).toHaveAttribute('aria-checked', 'true')
  expect(premium).toHaveFocus()
  expect(premium).toHaveAttribute('tabindex', '0')
  await user.keyboard('{ArrowDown}')
  expect(screen.getByRole('radio', { name: /basic/i })).toHaveFocus()
  await user.keyboard('{ArrowLeft}')
  expect(screen.getByRole('radio', { name: /premium/i })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  expect(
    screen.getByRole('radiogroup', { name: 'Choose your cover' }),
  ).toBeInTheDocument()
})

test('premium quote shows subsidy, cover and per-bar amounts', async () => {
  renderWithApp(<PremiumQuote />, quoteAt('farm-tea'))
  await screen.findByText('You pay KES 14,700')
  const q = buildQuote(farmOf('farm-tea'), 'standard')
  const svg = screen.getByRole('img', {
    name: 'What you pay compared with what you could get',
  })
  expect(svg.querySelector('[data-value]')?.textContent).toContain(
    formatKES(q.farmerPremiumKES),
  )
  expect(
    screen.getByText(formatKES(q.sumInsuredKES), { normalizer: (t) => t }),
  ).toBeInTheDocument()
  // legend: government pays half of 29,400
  expect(
    screen.getByText('Government pays').closest('li')?.textContent,
  ).toContain(formatKES(q.subsidyKES))
  expect(q.subsidyKES).toBe(14_700)
})

test('premium quote for an unknown farm shows Not Found', () => {
  renderWithApp(<PremiumQuote />, quoteAt('nope'))
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})

test('useQuotes refetches when the farm crop or season changes', async () => {
  const tea = farmOf('farm-tea')
  const spy = vi.spyOn(policyService, 'getQuote')
  const { result, rerender } = renderHook(
    ({ farm }) => useQuotes(farm, ['standard']),
    {
      initialProps: { farm: tea },
    },
  )
  await waitFor(() => expect(result.current.quotes).toHaveLength(1))
  expect(spy).toHaveBeenCalledTimes(1)
  const maize: Farm = { ...tea, crop: 'maize' }
  rerender({ farm: maize })
  expect(result.current.quotes).toBeNull()
  await waitFor(() => expect(result.current.quotes).toHaveLength(1))
  expect(spy).toHaveBeenCalledTimes(2)
  expect(spy).toHaveBeenLastCalledWith(maize, 'standard')
  rerender({ farm: { ...maize, season: 'short_rains' } })
  await waitFor(() => expect(spy).toHaveBeenCalledTimes(3))
})

test.each([100, 95, 5, 0])(
  'TriggerBar keeps its % label inside the viewBox at %i',
  (pct) => {
    const { container } = render(<TriggerBar triggerPct={pct} />)
    const label = container.querySelector('[data-testid="trigger-pct"]')
    const x = Number(label?.getAttribute('x'))
    expect(label).toHaveTextContent(`${pct}%`)
    expect(x).toBeGreaterThanOrEqual(16)
    expect(x).toBeLessThanOrEqual(184)
  },
)
