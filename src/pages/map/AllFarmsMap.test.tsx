import { act, screen, within } from '@testing-library/react'
import { fakeMap } from '@/src/test/mockFarmMap'
import AllFarmsMap from '@/src/pages/map/AllFarmsMap'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

vi.mock('@/src/components/map/FarmMap', () => import('@/src/test/mockFarmMap'))

const mapRoute = { route: '/map', path: '/map' }

const polygon = (name: string) =>
  within(screen.getByTestId('farm-map')).getByRole('button', { name })
const listed = (name: string) =>
  within(screen.getByRole('list', { name: 'Your farms' })).getByRole('button', {
    name,
  })

test('draws every farm and opens a summary sheet on tap', async () => {
  const { user } = renderWithApp(<AllFarmsMap />, {
    ...mapRoute,
    state: seededState(),
  })
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-polygons', '3')
  await user.click(polygon('Tea Garden'))
  const sheet = screen.getByRole('dialog', { name: 'Tea Garden' })
  expect(within(sheet).getByText('Not insured')).toBeInTheDocument()
  await user.click(within(sheet).getByRole('button', { name: 'Open farm' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/farm/farm-tea')
})

test('the sheet links to farm health and closes on Escape', async () => {
  const { user } = renderWithApp(<AllFarmsMap />, {
    ...mapRoute,
    state: seededState(),
  })
  await user.click(polygon('Tea Garden'))
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(polygon('Tea Garden')).toHaveFocus()
  await user.click(polygon('Tea Garden'))
  await user.click(screen.getByRole('button', { name: 'Farm health' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/monitor/farm-tea')
})

test('legend counts farms by health', () => {
  renderWithApp(<AllFarmsMap />, { ...mapRoute, state: seededState() })
  expect(screen.getByText('Good 2')).toBeInTheDocument()
  expect(screen.getByText('Alert 1')).toBeInTheDocument()
})

test('shows the bottom nav with the map tab, without a back button', () => {
  renderWithApp(<AllFarmsMap />, { ...mapRoute, state: seededState() })
  expect(screen.getByRole('link', { name: /Map/ })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
})

test('no farms shows an empty state with an add farm action', async () => {
  const { user } = renderWithApp(<AllFarmsMap />, {
    ...mapRoute,
    state: { ...seededState(), farms: [] },
  })
  expect(screen.getByText('No farms yet')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Map/ })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Add farm' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/add-farm')
})

test('a slow-tiles error shows a banner and leaves the map usable', async () => {
  const { user } = renderWithApp(<AllFarmsMap />, {
    ...mapRoute,
    state: seededState(),
  })
  await user.click(screen.getByRole('button', { name: 'tile-error' }))
  expect(screen.getByRole('status')).toHaveTextContent(
    'Map pictures are slow to load.',
  )
  expect(polygon('Tea Garden')).toBeInTheDocument()
})

test('offline closes the sheet, shows the overlay and keeps the nav reachable', async () => {
  const { user } = renderWithApp(<AllFarmsMap />, {
    ...mapRoute,
    state: seededState(),
  })
  await user.click(polygon('Tea Garden'))
  act(() => {
    window.dispatchEvent(new Event('offline'))
  })
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus()
  expect(screen.getByRole('link', { name: /Map/ })).toBeInTheDocument()
})

test('tapping a farm in the panel list frames it on the map and opens its sheet', async () => {
  const { user } = renderWithApp(<AllFarmsMap />, {
    ...mapRoute,
    state: seededState(),
  })
  fakeMap.fitBounds.mockClear()
  await user.click(listed('Tea Garden'))
  expect(fakeMap.fitBounds).toHaveBeenCalledWith(
    expect.any(Array),
    expect.objectContaining({ animate: false }),
  )
  expect(screen.getByRole('dialog', { name: 'Tea Garden' })).toBeInTheDocument()
})

test('the panel lists every farm so all are reachable at any zoom', () => {
  renderWithApp(<AllFarmsMap />, { ...mapRoute, state: seededState() })
  const list = screen.getByRole('list', { name: 'Your farms' })
  expect(within(list).getAllByRole('button')).toHaveLength(3)
})

test('Show all farms appears after focusing a farm and frames every farm', async () => {
  const { user } = renderWithApp(<AllFarmsMap />, {
    ...mapRoute,
    state: seededState(),
  })
  expect(
    screen.queryByRole('button', { name: 'Show all farms' }),
  ).not.toBeInTheDocument()
  await user.click(listed('Tea Garden'))
  await user.keyboard('{Escape}')
  fakeMap.fitBounds.mockClear()
  await user.click(screen.getByRole('button', { name: 'Show all farms' }))
  const [bounds, opts] = fakeMap.fitBounds.mock.calls[0]
  expect(bounds).toHaveLength(12)
  expect(opts).toMatchObject({ animate: false })
  expect(
    screen.queryByRole('button', { name: 'Show all farms' }),
  ).not.toBeInTheDocument()
})
