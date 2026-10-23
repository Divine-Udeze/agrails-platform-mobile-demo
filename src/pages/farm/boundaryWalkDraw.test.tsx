import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import * as router from 'react-router-dom'
import { emptyFarmForm } from '@/src/context/reducer'
import { STATE_KEY } from '@/src/context/persistence'
import BoundaryDraw from '@/src/pages/farm/BoundaryDraw'
import BoundaryWalk from '@/src/pages/farm/BoundaryWalk'
import { TEST_SQUARE, fakeMap } from '@/src/test/mockFarmMap'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

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

// jsdom has no PointerEvent: this keeps clientX/clientY/pointerId on pointer events.
if (typeof window.PointerEvent === 'undefined') {
  class PolyfilledPointerEvent extends MouseEvent {
    pointerId: number
    isPrimary: boolean
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
      this.isPrimary = init.isPrimary ?? false
    }
  }
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    value: PolyfilledPointerEvent,
  })
}

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

function mockGeolocation(value: Partial<Geolocation> | undefined) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value,
  })
}

afterEach(() => {
  navigateSpy.mockClear()
  fakeMap.dragging.enable.mockClear()
  fakeMap.dragging.disable.mockClear()
  vi.restoreAllMocks()
  mockGeolocation(undefined)
})

const pos = (p: number[], accuracy: number) =>
  ({
    coords: { latitude: p[0], longitude: p[1], accuracy },
  }) as GeolocationPosition

/** A geolocation mock whose watch callbacks the test can drive. */
function controllableGps() {
  const cbs: {
    ok: PositionCallback
    err?: PositionErrorCallback | null
  } = { ok: () => {} }
  const clearWatch = vi.fn()
  const watchPosition = vi.fn(
    (ok: PositionCallback, err?: PositionErrorCallback | null) => {
      cbs.ok = ok
      cbs.err = err
      return 7
    },
  )
  mockGeolocation({ watchPosition, clearWatch })
  return { cbs, clearWatch, watchPosition }
}

test('walk: denied GPS offers tap-corners instead', async () => {
  const clearWatch = vi.fn()
  mockGeolocation({
    watchPosition: (_ok, err) => {
      err?.({ code: 1 } as GeolocationPositionError)
      return 1
    },
    clearWatch,
  })
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'Start walking' }))
  expect(screen.getByText("We can't find your location")).toBeInTheDocument()
  expect(clearWatch).toHaveBeenCalledWith(1)
  await user.click(screen.getByRole('button', { name: 'Tap corners instead' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/boundary-map')
})

test('walk: no geolocation at all shows the GPS error', async () => {
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'Start walking' }))
  expect(screen.getByText("We can't find your location")).toBeInTheDocument()
})

test('walk: a GPS timeout tells the farmer and keeps walking', async () => {
  const { cbs, clearWatch } = controllableGps()
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'Start walking' }))
  act(() => {
    cbs.err?.({ code: 3 } as GeolocationPositionError)
  })
  expect(screen.getByRole('alert')).toHaveTextContent('GPS is slow')
  expect(clearWatch).not.toHaveBeenCalled()
  act(() => {
    cbs.ok(pos(TEST_SQUARE[0], 5))
  })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('walk: records accurate points and finishes', async () => {
  const { cbs, clearWatch } = controllableGps()
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'Start walking' }))
  act(() => {
    cbs.ok(pos(TEST_SQUARE[0], 80)) // too inaccurate: ignored
    TEST_SQUARE.forEach((p) => cbs.ok(pos(p, 5)))
  })
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-path', '4')
  expect(screen.getByText('300 m walked')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Finish' }))
  expect(clearWatch).toHaveBeenCalledWith(7)
  expect(screen.getByTestId('location')).toHaveTextContent('/confirm-farm')
  expect(savedForm().method).toBe('walk')
  expect(savedForm().boundary).toHaveLength(4)
})

test('walk: double-clicking Finish saves and navigates once', async () => {
  const { cbs } = controllableGps()
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'Start walking' }))
  act(() => {
    TEST_SQUARE.forEach((p) => cbs.ok(pos(p, 5)))
  })
  const finish = screen.getByRole('button', { name: 'Finish' })
  act(() => {
    fireEvent.click(finish)
    fireEvent.click(finish)
  })
  expect(navigateSpy).toHaveBeenCalledTimes(1)
  expect(navigateSpy).toHaveBeenCalledWith('/confirm-farm')
  expect(savedForm().boundary).toHaveLength(4)
})

test('walk: Start again and leaving the page clear the watch', async () => {
  const { clearWatch, watchPosition } = controllableGps()
  const { user, unmount } = renderWithApp(
    <BoundaryWalk />,
    withForm('/boundary-walk'),
  )
  await user.click(screen.getByRole('button', { name: 'Start walking' }))
  await user.click(screen.getByRole('button', { name: 'Start again' }))
  expect(clearWatch).toHaveBeenCalledTimes(1)
  expect(watchPosition).toHaveBeenCalledTimes(2)
  unmount()
  expect(clearWatch).toHaveBeenCalledTimes(2)
})

test('walk: tile errors while online show the slow-map banner', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'tile-error' }))
  expect(screen.getByText('Map pictures are slow to load.')).toBeInTheDocument()
  expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument()
})

test('walk: tile errors while offline show the offline state', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'tile-error' }))
  expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
})

test('walk: without farm details goes back to add-farm', () => {
  renderWithApp(<BoundaryWalk />, {
    route: '/boundary-walk',
    path: '/boundary-walk',
    state: seededState(),
  })
  expect(screen.getByTestId('location')).toHaveTextContent('/add-farm')
})

test('draw: Done is locked until a shape is drawn', () => {
  renderWithApp(<BoundaryDraw />, withForm('/boundary-draw'))
  expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled()
  expect(screen.getByRole('radio', { name: 'Draw' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
})

test('draw: prefills only a shape saved by the draw method', () => {
  const { unmount } = renderWithApp(
    <BoundaryDraw />,
    withForm('/boundary-draw', { method: 'draw', boundary: TEST_SQUARE }),
  )
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-draft', '4')
  expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled()
  unmount()
  renderWithApp(
    <BoundaryDraw />,
    withForm('/boundary-draw', { method: 'map', boundary: TEST_SQUARE }),
  )
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-draft', '0')
})

test('draw: Draw again clears the shape and locks Done', async () => {
  const { user } = renderWithApp(
    <BoundaryDraw />,
    withForm('/boundary-draw', { method: 'draw', boundary: TEST_SQUARE }),
  )
  await user.click(screen.getByRole('button', { name: 'Draw again' }))
  expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled()
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-draft', '0')
})

test('draw: double-clicking Done saves and navigates once', () => {
  renderWithApp(
    <BoundaryDraw />,
    withForm('/boundary-draw', { method: 'draw', boundary: TEST_SQUARE }),
  )
  const done = screen.getByRole('button', { name: 'Done' })
  act(() => {
    fireEvent.click(done)
    fireEvent.click(done)
  })
  expect(navigateSpy).toHaveBeenCalledTimes(1)
  expect(navigateSpy).toHaveBeenCalledWith('/confirm-farm')
  expect(savedForm().method).toBe('draw')
  expect(savedForm().boundary).toHaveLength(4)
})

test('draw: Move map mode removes the drawing layer', async () => {
  const { user, container } = renderWithApp(
    <BoundaryDraw />,
    withForm('/boundary-draw'),
  )
  expect(container.querySelector('[data-testid="draw-layer"]')).not.toBeNull()
  await user.click(screen.getByRole('radio', { name: 'Move map' }))
  expect(container.querySelector('[data-testid="draw-layer"]')).toBeNull()
  expect(screen.getByRole('radio', { name: 'Move map' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
})

test('draw: tile errors while online show the slow-map banner', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  const { user } = renderWithApp(<BoundaryDraw />, withForm('/boundary-draw'))
  await user.click(screen.getByRole('button', { name: 'tile-error' }))
  expect(screen.getByText('Map pictures are slow to load.')).toBeInTheDocument()
})

const FEW = [
  [-0.3031, 36.08],
  [-0.3031, 36.0801],
]

test('walk: an early Finish explains and keeps the watch running', async () => {
  const { cbs, clearWatch } = controllableGps()
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'Start walking' }))
  act(() => {
    FEW.forEach((p) => cbs.ok(pos(p, 5)))
    cbs.ok(pos([-0.30311, 36.08005], 5))
  })
  await user.click(screen.getByRole('button', { name: 'Finish' }))
  expect(screen.getByRole('alert')).toHaveTextContent(
    'That area is too small. Keep walking',
  )
  expect(screen.getByRole('alert')).not.toHaveTextContent(/undo/i)
  expect(clearWatch).not.toHaveBeenCalled()
  expect(navigateSpy).not.toHaveBeenCalled()
  act(() => {
    cbs.ok(pos(TEST_SQUARE[2], 5))
  })
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-path', '4')
})

test('walk: a crossing path says so without mentioning undo', async () => {
  const { cbs, clearWatch } = controllableGps()
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'Start walking' }))
  const [nw, ne, se, sw] = TEST_SQUARE
  act(() => {
    // bow-tie: NW, SE, NE, SW
    ;[nw, se, ne, sw].forEach((p) => cbs.ok(pos(p, 5)))
  })
  await user.click(screen.getByRole('button', { name: 'Finish' }))
  expect(screen.getByRole('alert')).toHaveTextContent('crosses itself')
  expect(clearWatch).not.toHaveBeenCalled()
})

test('walk: a code 2 before any fix is fatal', async () => {
  const { cbs } = controllableGps()
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'Start walking' }))
  act(() => {
    cbs.err?.({ code: 2 } as GeolocationPositionError)
  })
  expect(screen.getByText("We can't find your location")).toBeInTheDocument()
})

test('walk: a code 2 after a fix is passing and clears on the next fix', async () => {
  const { cbs, clearWatch } = controllableGps()
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'Start walking' }))
  act(() => {
    cbs.ok(pos(TEST_SQUARE[0], 5))
  })
  act(() => {
    cbs.err?.({ code: 2 } as GeolocationPositionError)
  })
  expect(
    screen.queryByText("We can't find your location"),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('GPS is slow')
  expect(clearWatch).not.toHaveBeenCalled()
  act(() => {
    cbs.ok(pos(TEST_SQUARE[1], 5))
  })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('walk: code 1 stays fatal after a fix', async () => {
  const { cbs, clearWatch } = controllableGps()
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'Start walking' }))
  act(() => {
    cbs.ok(pos(TEST_SQUARE[0], 5))
  })
  act(() => {
    cbs.err?.({ code: 1 } as GeolocationPositionError)
  })
  expect(screen.getByText("We can't find your location")).toBeInTheDocument()
  expect(clearWatch).toHaveBeenCalledWith(7)
})

test('walk: Start again asks first when there is a path', async () => {
  const { cbs, clearWatch, watchPosition } = controllableGps()
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'Start walking' }))
  act(() => {
    TEST_SQUARE.forEach((p) => cbs.ok(pos(p, 5)))
  })
  await user.click(screen.getByRole('button', { name: 'Start again' }))
  const sheet = screen.getByRole('dialog', { name: 'Start the walk again?' })
  expect(sheet).toHaveTextContent('will be deleted')
  expect(watchPosition).toHaveBeenCalledTimes(1)
  await user.click(within(sheet).getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-path', '4')
  await user.click(screen.getByRole('button', { name: 'Start again' }))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Start again',
    }),
  )
  expect(clearWatch).toHaveBeenCalledTimes(1)
  expect(watchPosition).toHaveBeenCalledTimes(2)
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-path', '0')
})

test('draw: without farm details goes back to add-farm', () => {
  renderWithApp(<BoundaryDraw />, {
    route: '/boundary-draw',
    path: '/boundary-draw',
    state: seededState(),
  })
  expect(screen.getByTestId('location')).toHaveTextContent('/add-farm')
})

const layer = () => screen.getByTestId('draw-layer')
const ptr = (
  type: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'pointerCancel',
  id: number,
  x: number,
  y: number,
) => fireEvent[type](layer(), { pointerId: id, clientX: x, clientY: y })

function strokeSquare(id = 1) {
  ptr('pointerDown', id, 0, 0)
  ptr('pointerMove', id, 100, 0)
  ptr('pointerMove', id, 100, 100)
  ptr('pointerMove', id, 0, 100)
  ptr('pointerMove', id, 0, 2)
  ptr('pointerUp', id, 0, 2)
}

test('draw: a finger stroke becomes the boundary and Done saves it', async () => {
  const { user } = renderWithApp(<BoundaryDraw />, withForm('/boundary-draw'))
  strokeSquare()
  const done = screen.getByRole('button', { name: 'Done' })
  expect(done).toBeEnabled()
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-draft', '4')
  await user.click(done)
  expect(screen.getByTestId('location')).toHaveTextContent('/confirm-farm')
  expect(savedForm().method).toBe('draw')
  expect(savedForm().boundary.length).toBeGreaterThanOrEqual(3)
})

test('draw: tiny moves are skipped (8 px throttle)', async () => {
  renderWithApp(<BoundaryDraw />, withForm('/boundary-draw'))
  ptr('pointerDown', 1, 0, 0)
  ptr('pointerMove', 1, 3, 0)
  ptr('pointerMove', 1, 5, 0)
  ptr('pointerMove', 1, 10, 0)
  await waitFor(() =>
    expect(screen.getByTestId('farm-map')).toHaveAttribute('data-path', '2'),
  )
})

test('draw: dragging is off in Draw mode and on in Move mode', async () => {
  const { user } = renderWithApp(<BoundaryDraw />, withForm('/boundary-draw'))
  expect(fakeMap.dragging.disable).toHaveBeenCalled()
  expect(fakeMap.dragging.enable).not.toHaveBeenCalled()
  await user.click(screen.getByRole('radio', { name: 'Move map' }))
  expect(fakeMap.dragging.enable).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole('radio', { name: 'Draw' }))
  expect(fakeMap.dragging.disable).toHaveBeenCalledTimes(2)
})

test('draw: pointercancel ends the stroke and discards it', () => {
  renderWithApp(<BoundaryDraw />, withForm('/boundary-draw'))
  ptr('pointerDown', 1, 0, 0)
  ptr('pointerMove', 1, 100, 0)
  ptr('pointerMove', 1, 100, 100)
  ptr('pointerCancel', 1, 100, 100)
  ptr('pointerMove', 1, 0, 100)
  ptr('pointerUp', 1, 0, 100)
  expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled()
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-draft', '0')
})

test('draw: a second finger is ignored mid-stroke', () => {
  renderWithApp(<BoundaryDraw />, withForm('/boundary-draw'))
  ptr('pointerDown', 1, 0, 0)
  ptr('pointerDown', 2, 500, 500)
  ptr('pointerMove', 2, 600, 600)
  ptr('pointerUp', 2, 600, 600)
  ptr('pointerMove', 1, 100, 0)
  ptr('pointerMove', 1, 100, 100)
  ptr('pointerMove', 1, 0, 100)
  ptr('pointerUp', 1, 0, 100)
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-draft', '4')
})

test('draw: a short stroke keeps the shape that was already there', () => {
  renderWithApp(
    <BoundaryDraw />,
    withForm('/boundary-draw', { method: 'draw', boundary: TEST_SQUARE }),
  )
  ptr('pointerDown', 1, 10, 10)
  ptr('pointerUp', 1, 10, 10)
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-draft', '4')
  expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled()
})

test('draw: switching to Move mode mid-stroke discards the stroke', async () => {
  const { user } = renderWithApp(<BoundaryDraw />, withForm('/boundary-draw'))
  ptr('pointerDown', 1, 0, 0)
  ptr('pointerMove', 1, 100, 0)
  await user.click(screen.getByRole('radio', { name: 'Move map' }))
  await user.click(screen.getByRole('radio', { name: 'Draw' }))
  ptr('pointerUp', 1, 100, 0)
  expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled()
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-path', '0')
})

test('walk: a validation error stays while walking until Finish is tapped again', async () => {
  const { cbs, clearWatch } = controllableGps()
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'Start walking' }))
  act(() => {
    cbs.ok(pos(TEST_SQUARE[0], 5))
    cbs.ok(pos(TEST_SQUARE[1], 5))
    // 3 m further down the east edge: three points, but a sliver
    cbs.ok(pos([TEST_SQUARE[1][0] - 0.00003, TEST_SQUARE[1][1]], 5))
  })
  await user.click(screen.getByRole('button', { name: 'Finish' }))
  expect(screen.getByRole('alert')).toHaveTextContent('too small')
  act(() => {
    cbs.ok(pos(TEST_SQUARE[2], 5))
    cbs.ok(pos(TEST_SQUARE[3], 5))
  })
  expect(screen.getByRole('alert')).toHaveTextContent('too small')
  await user.click(screen.getByRole('button', { name: 'Finish' }))
  expect(clearWatch).toHaveBeenCalledWith(7)
  expect(screen.getByTestId('location')).toHaveTextContent('/confirm-farm')
})

test('draw: a lost pointer capture discards the stroke and frees the layer', () => {
  renderWithApp(
    <BoundaryDraw />,
    withForm('/boundary-draw', { method: 'draw', boundary: TEST_SQUARE }),
  )
  ptr('pointerDown', 1, 0, 0)
  ptr('pointerMove', 1, 100, 0)
  fireEvent.lostPointerCapture(layer(), { pointerId: 1 })
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-draft', '4')
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-path', '0')
  strokeSquare(2)
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-draft', '4')
})

test('draw: a new primary pointer replaces a stroke whose end was never seen', () => {
  renderWithApp(<BoundaryDraw />, withForm('/boundary-draw'))
  ptr('pointerDown', 1, 0, 0)
  ptr('pointerMove', 1, 100, 0)
  // pointer 1 vanished without pointerup/cancel; a fresh primary pointer starts
  fireEvent.pointerDown(layer(), {
    pointerId: 2,
    isPrimary: true,
    clientX: 0,
    clientY: 0,
  })
  ptr('pointerMove', 2, 100, 0)
  ptr('pointerMove', 2, 100, 100)
  ptr('pointerMove', 2, 0, 100)
  ptr('pointerUp', 2, 0, 100)
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-draft', '4')
})

test('draw: a new stroke of 3+ corners replaces a prefilled boundary', async () => {
  const { user } = renderWithApp(
    <BoundaryDraw />,
    withForm('/boundary-draw', { method: 'draw', boundary: TEST_SQUARE }),
  )
  // a triangle, clearly different from the prefilled 4-corner square
  ptr('pointerDown', 1, 0, 0)
  ptr('pointerMove', 1, 200, 0)
  ptr('pointerMove', 1, 100, 150)
  ptr('pointerUp', 1, 100, 150)
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-draft', '3')
  await user.click(screen.getByRole('button', { name: 'Done' }))
  expect(savedForm().boundary).toHaveLength(3)
})
