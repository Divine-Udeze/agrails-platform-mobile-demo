import { renderHook, screen, waitFor, within } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import type { Farm } from '@/src/types'
import YieldAnalysis, { useYieldAnalysis } from '@/src/pages/farm/YieldAnalysis'
import YieldReport from '@/src/pages/farm/YieldReport'
import * as farmService from '@/src/services/farmService'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

afterEach(() => vi.restoreAllMocks())

const at = (id: string) => ({
  route: `/yield-analysis/${id}`,
  path: '/yield-analysis/:farmId',
  state: seededState(),
})
const reportAt = (id: string) => ({
  route: `/yield-report/${id}`,
  path: '/yield-report/:farmId',
  state: seededState(),
})

test('high-risk beans farm: bad years highlighted and gauge says high', async () => {
  renderWithApp(<YieldAnalysis />, at('farm-beans'))
  const chart = await screen.findByRole('img', {
    name: 'Harvest per hectare by year',
  })
  expect(chart.querySelectorAll('[data-bar]')).toHaveLength(10)
  expect(chart.querySelectorAll('[data-highlight="true"]')).toHaveLength(4)
  expect(
    screen.getByText(
      'In 4 of the last 10 seasons, harvests fell below 70% of normal.',
    ),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('img', { name: 'Risk level: High risk' }),
  ).toBeInTheDocument()
})

test('chart labels are unique', async () => {
  renderWithApp(<YieldAnalysis />, at('farm-beans'))
  const chart = await screen.findByRole('img', {
    name: 'Harvest per hectare by year',
  })
  const labels = [...chart.querySelectorAll('[data-bar]')].map((e) =>
    e.getAttribute('data-bar'),
  )
  expect(new Set(labels).size).toBe(labels.length)
})

test('uninsured farm is offered insurance', async () => {
  const { user } = renderWithApp(<YieldAnalysis />, at('farm-tea'))
  await user.click(
    await screen.findByRole('button', { name: 'See insurance options' }),
  )
  await waitFor(() =>
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/insure/farm-tea',
    ),
  )
})

test('insured farm goes back to the farm', async () => {
  const { user } = renderWithApp(<YieldAnalysis />, at('farm-maize'))
  await user.click(await screen.findByRole('button', { name: 'Back to farm' }))
  await waitFor(() =>
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/farm/farm-maize',
    ),
  )
})

test('unknown farm shows Not Found', () => {
  renderWithApp(<YieldAnalysis />, at('nope'))
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})

test('report: unknown farm shows Not Found', () => {
  renderWithApp(<YieldReport />, reportAt('nope'))
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})

test('report lists every year and flags bad ones', async () => {
  renderWithApp(<YieldReport />, reportAt('farm-beans'))
  const table = await screen.findByRole('table')
  const rows = within(table).getAllByRole('row')
  expect(rows).toHaveLength(11)
  expect(table.querySelectorAll('tr[data-bad="true"]')).toHaveLength(4)
  expect(
    screen.getByRole('img', { name: 'Season rainfall by year' }),
  ).toBeInTheDocument()
})

test('a failed analysis shows an error, retry recovers', async () => {
  vi.spyOn(farmService, 'analyzeFarmYield').mockRejectedValueOnce(
    new Error('boom'),
  )
  const { user } = renderWithApp(<YieldAnalysis />, at('farm-beans'))
  expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(
    await screen.findByRole('img', { name: 'Harvest per hectare by year' }),
  ).toBeInTheDocument()
  expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
})

test('report: a failed analysis shows an error, retry recovers', async () => {
  vi.spyOn(farmService, 'analyzeFarmYield').mockRejectedValueOnce(
    new Error('boom'),
  )
  const { user } = renderWithApp(<YieldReport />, reportAt('farm-beans'))
  expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('table')).toBeInTheDocument()
})

test('shows loading while the analysis is pending', () => {
  vi.spyOn(farmService, 'analyzeFarmYield').mockImplementation(
    () => new Promise(() => {}),
  )
  renderWithApp(<YieldAnalysis />, at('farm-beans'))
  expect(screen.getByRole('status')).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'See insurance options' }),
  ).not.toBeInTheDocument()
})

test('error, retry, second rejection shows the error again and retry still works', async () => {
  vi.spyOn(farmService, 'analyzeFarmYield')
    .mockRejectedValueOnce(new Error('one'))
    .mockRejectedValueOnce(new Error('two'))
  const { user } = renderWithApp(<YieldAnalysis />, at('farm-beans'))
  await screen.findByText('Something went wrong')
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByText('Something went wrong')
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(
    await screen.findByRole('img', { name: 'Harvest per hectare by year' }),
  ).toBeInTheDocument()
})

test('changing farm resets the hook to loading, dropping the old result', async () => {
  const state = seededState()
  const beans = state.farms.find((f) => f.id === 'farm-beans') as Farm
  const maize = state.farms.find((f) => f.id === 'farm-maize') as Farm
  const { result, rerender } = renderHook(
    ({ farm }: { farm: Farm }) => useYieldAnalysis(farm),
    { initialProps: { farm: beans } },
  )
  await waitFor(() => expect(result.current.result).not.toBeNull())
  const beansResult = result.current.result
  vi.spyOn(farmService, 'analyzeFarmYield').mockImplementation(
    () => new Promise(() => {}),
  )
  rerender({ farm: maize })
  await waitFor(() => expect(result.current.result).toBeNull())
  expect(result.current.result).not.toBe(beansResult)
  expect(result.current.error).toBe(false)
})
