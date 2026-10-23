import { act, fireEvent, screen } from '@testing-library/react'
import * as router from 'react-router-dom'
import { emptyFarmForm } from '@/src/context/reducer'
import { STATE_KEY } from '@/src/context/persistence'
import BoundaryIntro from '@/src/pages/farm/BoundaryIntro'
import BoundaryMap from '@/src/pages/farm/BoundaryMap'
import BoundaryQuickMap from '@/src/pages/farm/BoundaryQuickMap'
import { TEST_SQUARE } from '@/src/test/mockFarmMap'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'
import { polygonAreaHa } from '@/src/utils/geo'

vi.mock('@/src/components/map/FarmMap', () => import('@/src/test/mockFarmMap'))

const navigateSpy = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => {
      const navigate = actual.useNavigate()
      return (...args: Parameters<typeof navigate>) => {
        navigateSpy(...args)
        return navigate(...args)
      }
    },
  }
})
void router

afterEach(() => {
  navigateSpy.mockClear()
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'geolocation')
})

const savedForm = () => JSON.parse(localStorage.getItem(STATE_KEY)!).farmForm

const withForm = (path: string, extra: Partial<typeof emptyFarmForm> = {}) => ({
  route: path,
  path,
  state: {
    ...seededState(),
    farmForm: {
      ...emptyFarmForm,
      name: 'River plot',
      crop: 'beans' as const,
      season: 'short_rains' as const,
      plantingDate: '2026-10-12',
      ...extra,
    },
  },
})

test('intro offers three methods plus a quick pin', async () => {
  const { user } = renderWithApp(<BoundaryIntro />, withForm('/boundary-intro'))
  expect(
    screen.getByRole('button', { name: /tap the corners/i }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: /walk around/i }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: /draw with your finger/i }),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /walk around/i }))
  expect(screen.getByTestId('location')).toHaveTextContent('/boundary-walk')
  expect(savedForm().method).toBe('walk')
})

test('intro clears the old shape when the method changes', async () => {
  const { user } = renderWithApp(
    <BoundaryIntro />,
    withForm('/boundary-intro', { method: 'quick', boundary: TEST_SQUARE }),
  )
  await user.click(screen.getByRole('button', { name: /tap the corners/i }))
  expect(savedForm().method).toBe('map')
  expect(savedForm().boundary).toEqual([])
})

test('intro clears the old shape when switching to a quick pin', async () => {
  const { user } = renderWithApp(
    <BoundaryIntro />,
    withForm('/boundary-intro', { method: 'map', boundary: TEST_SQUARE }),
  )
  await user.click(screen.getByRole('link', { name: /just drop a pin/i }))
  expect(savedForm().method).toBe('quick')
  expect(savedForm().boundary).toEqual([])
})

test('intro keeps the corners when the same method is chosen again', async () => {
  const { user } = renderWithApp(
    <BoundaryIntro />,
    withForm('/boundary-intro', { method: 'map', boundary: TEST_SQUARE }),
  )
  await user.click(screen.getByRole('button', { name: /tap the corners/i }))
  expect(savedForm().boundary).toHaveLength(4)
})

test('tap map prefills the corners saved for the same method', () => {
  renderWithApp(
    <BoundaryMap />,
    withForm('/boundary-map', { method: 'map', boundary: TEST_SQUARE }),
  )
  expect(screen.getByText('4 corners marked')).toBeInTheDocument()
})

test('intro without farm details goes back to add-farm', () => {
  renderWithApp(<BoundaryIntro />, {
    route: '/boundary-intro',
    path: '/boundary-intro',
    state: seededState(),
  })
  expect(screen.getByTestId('location')).toHaveTextContent('/add-farm')
})

test('tap-corners: Done unlocks at 3 corners, shows live area, saves boundary', async () => {
  const { user } = renderWithApp(<BoundaryMap />, withForm('/boundary-map'))
  const done = screen.getByRole('button', { name: 'Done' })
  expect(done).toBeDisabled()
  for (let i = 0; i < 4; i++)
    await user.click(screen.getByRole('button', { name: 'map-tap' }))
  expect(screen.getByText('4 corners marked')).toBeInTheDocument()
  expect(screen.getByText(/^1 ha · 2.5 acres$/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Undo' }))
  expect(screen.getByText('3 corners marked')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'map-tap' }))
  await user.click(done)
  expect(screen.getByTestId('location')).toHaveTextContent('/confirm-farm')
  expect(
    JSON.parse(localStorage.getItem(STATE_KEY)!).farmForm.boundary,
  ).toHaveLength(4)
})

test('tap-corners explains an invalid shape', async () => {
  const { user } = renderWithApp(<BoundaryMap />, withForm('/boundary-map'))
  // The mock cycles NW, NE, SE, SW, NW, NE, ...
  const tap = () => user.click(screen.getByRole('button', { name: 'map-tap' }))
  for (let i = 0; i < 4; i++) await tap()
  await user.click(screen.getByRole('button', { name: 'Undo' }))
  await user.click(screen.getByRole('button', { name: 'Undo' }))
  await tap() // NW again
  await tap() // NE again -> NW, NE, NW, NE has zero area
  await user.click(screen.getByRole('button', { name: 'Done' }))
  expect(screen.getByRole('alert')).toHaveTextContent('smaller than 0.05 ha')
  expect(screen.getByTestId('farm-map')).toBeInTheDocument()
})

test('quick pin builds a square of the chosen size', async () => {
  const { user } = renderWithApp(
    <BoundaryQuickMap />,
    withForm('/boundary-quick-map'),
  )
  await user.click(screen.getByRole('button', { name: 'map-tap' }))
  await user.click(screen.getByRole('radio', { name: '2 acres' }))
  expect(screen.getByText(/^0.81 ha · 2 acres$/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Done' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/confirm-farm')
})

test('quick pin saves a square of about the chosen size', async () => {
  const { user } = renderWithApp(
    <BoundaryQuickMap />,
    withForm('/boundary-quick-map'),
  )
  await user.click(screen.getByRole('button', { name: 'map-tap' }))
  await user.click(screen.getByRole('radio', { name: '2 acres' }))
  await user.click(screen.getByRole('button', { name: 'Done' }))
  const form = savedForm()
  expect(form.method).toBe('quick')
  expect(form.boundary).toHaveLength(4)
  expect(polygonAreaHa(form.boundary)).toBeCloseTo(0.809, 2)
})

test('double-clicking Done saves and navigates once', () => {
  renderWithApp(
    <BoundaryMap />,
    withForm('/boundary-map', { method: 'map', boundary: TEST_SQUARE }),
  )
  const done = screen.getByRole('button', { name: 'Done' })
  act(() => {
    fireEvent.click(done)
    fireEvent.click(done)
  })
  expect(navigateSpy).toHaveBeenCalledTimes(1)
  expect(navigateSpy).toHaveBeenCalledWith('/confirm-farm')
  expect(savedForm().boundary).toHaveLength(4)
})

test('locate failure explains what to do instead', async () => {
  const getCurrentPosition = vi.fn(
    (_ok: unknown, fail: () => void, _options?: PositionOptions) => fail(),
  )
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition },
    configurable: true,
  })
  const { user } = renderWithApp(<BoundaryMap />, withForm('/boundary-map'))
  await user.click(screen.getByRole('button', { name: 'Go to my location' }))
  expect(screen.getByRole('alert')).toHaveTextContent(
    "couldn't find your location",
  )
  expect(getCurrentPosition.mock.calls[0][2]).toMatchObject({ timeout: 10000 })
})

test('tile errors while online show a banner and keep the map usable', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  const { user } = renderWithApp(<BoundaryMap />, withForm('/boundary-map'))
  await user.click(screen.getByRole('button', { name: 'tile-error' }))
  expect(screen.getByText('Map pictures are slow to load.')).toBeInTheDocument()
  expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'map-tap' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(
    screen.queryByText('Map pictures are slow to load.'),
  ).not.toBeInTheDocument()
})

test('tile errors while offline show the full-screen offline state', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  const { user } = renderWithApp(
    <BoundaryQuickMap />,
    withForm('/boundary-quick-map'),
  )
  await user.click(screen.getByRole('button', { name: 'tile-error' }))
  expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
  expect(
    screen.queryByText('Map pictures are slow to load.'),
  ).not.toBeInTheDocument()
})

test('going offline mid-session shows the offline state', () => {
  renderWithApp(<BoundaryMap />, withForm('/boundary-map'))
  act(() => {
    window.dispatchEvent(new Event('offline'))
  })
  expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
})
