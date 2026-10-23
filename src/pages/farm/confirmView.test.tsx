import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { emptyFarmForm } from '@/src/context/reducer'
import { STATE_KEY } from '@/src/context/persistence'
import { useFarmForm } from '@/src/context/AppContext'
import { requiredFormStep } from '@/src/pages/farm/formGuard'
import ConfirmFarm from '@/src/pages/farm/ConfirmFarm'
import ViewBoundary from '@/src/pages/farm/ViewBoundary'
import * as farmService from '@/src/services/farmService'
import { TEST_SQUARE } from '@/src/test/mockFarmMap'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'
import type { Farm, FarmFormData } from '@/src/types'

vi.mock('@/src/components/map/FarmMap', () => import('@/src/test/mockFarmMap'))

const details = {
  name: 'River plot',
  crop: 'beans' as const,
  season: 'short_rains' as const,
  plantingDate: '2026-10-12',
}

const confirmAt = (
  farmForm: FarmFormData = {
    ...emptyFarmForm,
    ...details,
    method: 'map' as const,
    boundary: TEST_SQUARE,
  },
) => ({
  route: '/confirm-farm',
  path: '/confirm-farm',
  state: { ...seededState(), farmForm },
})

/** Logs every pathname; the leave button goes to a guarded stand-in page (like boundary-intro). */
function LocationLog({ log }: { log: string[] }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { form } = useFarmForm()
  log.push(pathname)
  const bounce = pathname === '/boundary-intro' && requiredFormStep(form)
  return (
    <>
      {bounce && <Navigate to={bounce} replace />}
      <button type='button' onClick={() => navigate('/boundary-intro')}>
        leave
      </button>
    </>
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

test('summarises the farm and saves it', async () => {
  const { user } = renderWithApp(<ConfirmFarm />, confirmAt())
  expect(screen.getByText('River plot')).toBeInTheDocument()
  expect(screen.getByText('1 ha · 2.5 acres')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Save farm' }))
  const loc = await screen.findByTestId('location')
  expect(loc).toHaveTextContent(/^\/yield-analysis\/farm-/)
  expect(loc).not.toHaveTextContent('/add-farm')
  const stored = JSON.parse(localStorage.getItem(STATE_KEY)!)
  expect(stored.farms).toHaveLength(4)
  expect(stored.farmForm.name).toBe('')
})

test('after saving the farmer lands on yield analysis, never add-farm', async () => {
  const log: string[] = []
  const { user } = renderWithApp(<ConfirmFarm />, {
    ...confirmAt(),
    extra: <LocationLog log={log} />,
  })
  await user.click(screen.getByRole('button', { name: 'Save farm' }))
  // Settle on either outcome, then assert clearly rather than timing out.
  await waitFor(() =>
    expect(
      log.some((p) => p === '/add-farm' || p.startsWith('/yield-analysis/')),
    ).toBe(true),
  )
  const stored = JSON.parse(localStorage.getItem(STATE_KEY)!)
  const newFarm = stored.farms[stored.farms.length - 1]
  expect(log).not.toContain('/add-farm')
  expect(log[log.length - 1]).toBe(`/yield-analysis/${newFarm.id}`)
  expect(stored.farmForm).toEqual(emptyFarmForm)
})

test('back is disabled while a save is in flight', async () => {
  let resolve!: (f: Farm) => void
  vi.spyOn(farmService, 'createFarm').mockImplementation(
    () => new Promise<Farm>((r) => (resolve = r)),
  )
  const { user } = renderWithApp(<ConfirmFarm />, confirmAt())
  expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'Save farm' }))
  expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
  await act(async () => {
    resolve({ ...seededState().farms[0], id: 'farm-new', name: 'River plot' })
  })
})

test('a save finishing after the farmer left keeps the farm and lands on its detail page', async () => {
  let resolve!: (f: Farm) => void
  vi.spyOn(farmService, 'createFarm').mockImplementation(
    () => new Promise<Farm>((r) => (resolve = r)),
  )
  const log: string[] = []
  const { user } = renderWithApp(<ConfirmFarm />, {
    ...confirmAt(),
    extra: <LocationLog log={log} />,
  })
  await user.click(screen.getByRole('button', { name: 'Save farm' }))
  await user.click(screen.getByRole('button', { name: 'leave' }))
  expect(log[log.length - 1]).toBe('/boundary-intro')
  await act(async () => {
    resolve({ ...seededState().farms[0], id: 'farm-late', name: 'River plot' })
  })
  await waitFor(() =>
    expect(log.some((p) => p === '/add-farm' || p === '/farm/farm-late')).toBe(
      true,
    ),
  )
  expect(log).not.toContain('/add-farm')
  expect(log[log.length - 1]).toBe('/farm/farm-late')
  const stored = JSON.parse(localStorage.getItem(STATE_KEY)!)
  expect(stored.farms).toHaveLength(4)
  expect(stored.farmForm).toEqual(emptyFarmForm)
})

test('works under StrictMode: lands on yield analysis, one farm added', async () => {
  const log: string[] = []
  const { user } = renderWithApp(<ConfirmFarm />, {
    ...confirmAt(),
    extra: <LocationLog log={log} />,
    strict: true,
  })
  await user.click(screen.getByRole('button', { name: 'Save farm' }))
  await waitFor(() => expect(log.some((p) => p !== '/confirm-farm')).toBe(true))
  const stored = JSON.parse(localStorage.getItem(STATE_KEY)!)
  expect(stored.farms).toHaveLength(4)
  const newFarm = stored.farms[stored.farms.length - 1]
  expect(log).not.toContain('/add-farm')
  expect(log[log.length - 1]).toBe(`/yield-analysis/${newFarm.id}`)
})

test('two quick taps on save create only one farm', async () => {
  let resolve!: (f: Farm) => void
  const spy = vi
    .spyOn(farmService, 'createFarm')
    .mockImplementation(() => new Promise<Farm>((r) => (resolve = r)))
  renderWithApp(<ConfirmFarm />, confirmAt())
  const save = screen.getByRole('button', { name: 'Save farm' })
  act(() => {
    fireEvent.click(save)
    fireEvent.click(save)
  })
  expect(spy).toHaveBeenCalledTimes(1)
  await act(async () => {
    resolve({
      ...seededState().farms[0],
      id: 'farm-new',
      name: 'River plot',
    })
  })
  await waitFor(() =>
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/yield-analysis/farm-new',
    ),
  )
  const stored = JSON.parse(localStorage.getItem(STATE_KEY)!)
  expect(stored.farms).toHaveLength(4)
})

test('a failed save shows an error and can be retried', async () => {
  const spy = vi
    .spyOn(farmService, 'createFarm')
    .mockRejectedValueOnce(new Error('boom'))
  const { user } = renderWithApp(<ConfirmFarm />, confirmAt())
  await user.click(screen.getByRole('button', { name: 'Save farm' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Please try again.',
  )
  spy.mockRestore()
  await user.click(screen.getByRole('button', { name: 'Save farm' }))
  await waitFor(() =>
    expect(screen.getByTestId('location')).toHaveTextContent(
      /^\/yield-analysis\/farm-/,
    ),
  )
})

test('missing details go back to the add-farm form', () => {
  renderWithApp(
    <ConfirmFarm />,
    confirmAt({ ...emptyFarmForm, boundary: TEST_SQUARE }),
  )
  return waitFor(() =>
    expect(screen.getByTestId('location')).toHaveTextContent('/add-farm'),
  )
})

test('valid details but missing boundary goes to boundary intro', () => {
  renderWithApp(
    <ConfirmFarm />,
    confirmAt({ ...emptyFarmForm, ...details, boundary: [] }),
  )
  return waitFor(() =>
    expect(screen.getByTestId('location')).toHaveTextContent('/boundary-intro'),
  )
})

test('invalid boundary goes to boundary intro', () => {
  renderWithApp(
    <ConfirmFarm />,
    confirmAt({
      ...emptyFarmForm,
      ...details,
      boundary: TEST_SQUARE.slice(0, 2),
    }),
  )
  return waitFor(() =>
    expect(screen.getByTestId('location')).toHaveTextContent('/boundary-intro'),
  )
})

test('tile trouble shows a banner when online, an overlay only when offline', async () => {
  const { user } = renderWithApp(<ConfirmFarm />, confirmAt())
  await user.click(screen.getByRole('button', { name: 'tile-error' }))
  expect(screen.getByRole('status')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Save farm' })).toBeInTheDocument()
})

test('offline tile trouble shows the full-screen overlay', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  const { user } = renderWithApp(<ConfirmFarm />, confirmAt())
  await user.click(screen.getByRole('button', { name: 'tile-error' }))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
})

test('view boundary shows size, corners and edge length', () => {
  renderWithApp(<ViewBoundary />, {
    route: '/view-boundary/farm-maize',
    path: '/view-boundary/:farmId',
    state: seededState(),
  })
  expect(screen.getByText('4 corners')).toBeInTheDocument()
  expect(screen.getByText('Edge length 438 m')).toBeInTheDocument()
  expect(screen.getByText('1.2 ha · 3 acres')).toBeInTheDocument()
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-polygons', '1')
})

test('view boundary for an unknown farm shows Not Found', () => {
  renderWithApp(<ViewBoundary />, {
    route: '/view-boundary/nope',
    path: '/view-boundary/:farmId',
    state: seededState(),
  })
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})
