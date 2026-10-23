import { StrictMode } from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { FarmMap } from '@/src/components/map/FarmMap'
import type { LatLng } from '@/src/types'

const DRAFT: LatLng[] = [
  [-0.3031, 36.08],
  [-0.3031, 36.0809],
  [-0.3039, 36.0809],
]

beforeAll(() => {
  // jsdom has no layout; give the map element a size.
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    value: 360,
  })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    value: 640,
  })
})

test('mounts under StrictMode with exactly one map and draws the draft', () => {
  const { container, rerender } = render(
    <StrictMode>
      <FarmMap />
    </StrictMode>,
  )
  expect(container.querySelectorAll('.leaflet-container')).toHaveLength(1)
  expect(container.querySelectorAll('path.leaflet-interactive')).toHaveLength(0)
  rerender(
    <StrictMode>
      <FarmMap draft={DRAFT} fitTo={DRAFT} />
    </StrictMode>,
  )
  expect(container.querySelectorAll('.leaflet-container')).toHaveLength(1)
  expect(
    container.querySelectorAll('path.leaflet-interactive').length,
  ).toBeGreaterThan(0)
})

test('shows only the Esri tile attribution, without the Leaflet prefix', () => {
  const { container } = render(<FarmMap />)
  const text = container.querySelector(
    '.leaflet-control-attribution',
  )?.textContent
  expect(text).toContain('Tiles © Esri')
  expect(text).not.toContain('Leaflet')
})

test('unmount removes the map', () => {
  const { container, unmount } = render(<FarmMap />)
  const el = container.querySelector('.leaflet-container')!
  unmount()
  expect(document.querySelector('.leaflet-container')).toBeNull()
  expect(el.querySelector('.leaflet-pane')).toBeNull()
})

const FARM: LatLng[] = [
  [-0.3031, 36.08],
  [-0.3031, 36.0809],
  [-0.3039, 36.0809],
  [-0.3039, 36.08],
]
const farm = (onClick = vi.fn()) => ({
  id: 'f1',
  boundary: FARM,
  color: '#2f9e5a',
  label: 'Tea Garden',
  onClick,
})

test('below the pin zoom, farms are pins and tapping one calls onClick', () => {
  const onClick = vi.fn()
  const { container } = render(
    <FarmMap
      zoom={10}
      pinsBelowZoom={14}
      center={FARM[0]}
      polygons={[farm(onClick)]}
    />,
  )
  expect(container.querySelectorAll('path.farm-pin')).toHaveLength(1)
  expect(container.querySelectorAll('path.farm-pin-hit')).toHaveLength(1)
  expect(container.querySelector('.leaflet-tooltip')?.textContent).toBe(
    'Tea Garden',
  )
  fireEvent.click(container.querySelector('path.farm-pin')!)
  expect(onClick).toHaveBeenCalledOnce()
  fireEvent.click(container.querySelector('path.farm-pin-hit')!)
  expect(onClick).toHaveBeenCalledTimes(2)
})

test('at or above the pin zoom, farms are polygons, not pins', () => {
  const { container } = render(
    <FarmMap
      zoom={14}
      pinsBelowZoom={14}
      center={FARM[0]}
      polygons={[farm()]}
    />,
  )
  expect(container.querySelectorAll('path.farm-pin')).toHaveLength(0)
  expect(container.querySelectorAll('path.leaflet-interactive')).toHaveLength(1)
})

test('without pinsBelowZoom the polygon is drawn at any zoom', () => {
  const { container } = render(
    <FarmMap zoom={6} center={FARM[0]} polygons={[farm()]} />,
  )
  expect(container.querySelectorAll('path.farm-pin')).toHaveLength(0)
  expect(container.querySelectorAll('path.leaflet-interactive')).toHaveLength(1)
})

test('zooming across the threshold redraws pins and polygons', () => {
  let map: import('leaflet').Map | undefined
  const { container } = render(
    <FarmMap
      zoom={16}
      pinsBelowZoom={14}
      center={FARM[0]}
      polygons={[farm()]}
      onReady={(m) => {
        map = m
      }}
    />,
  )
  expect(container.querySelectorAll('path.farm-pin')).toHaveLength(0)
  act(() => {
    map!.setZoom(10, { animate: false })
  })
  expect(container.querySelectorAll('path.farm-pin')).toHaveLength(1)
  act(() => {
    map!.setZoom(16, { animate: false })
  })
  expect(container.querySelectorAll('path.farm-pin')).toHaveLength(0)
})

describe('pin labels', () => {
  const realRect = HTMLElement.prototype.getBoundingClientRect
  beforeAll(() => {
    // jsdom has no layout: derive tooltip and container boxes from Leaflet's styles.
    HTMLElement.prototype.getBoundingClientRect = function () {
      const box = (l: number, t: number, w: number, h: number) =>
        ({
          left: l,
          top: t,
          width: w,
          height: h,
          right: l + w,
          bottom: t + h,
        }) as DOMRect
      if (this.classList.contains('leaflet-container'))
        return box(0, 0, 360, 640)
      if (this.classList.contains('leaflet-tooltip')) {
        // Leaflet places by style left/top with a 0x0 box; apply the real 100x20 size.
        const has = (c: string) =>
          this.classList.contains(`leaflet-tooltip-${c}`)
        const sideways = has('top') || has('bottom')
        const left =
          parseFloat(this.style.left) - (has('left') ? 100 : sideways ? 50 : 0)
        const top = parseFloat(this.style.top) - (has('top') ? 20 : 0)
        return box(left, top, 100, 20)
      }
      return realRect.call(this)
    }
  })
  afterAll(() => {
    HTMLElement.prototype.getBoundingClientRect = realRect
  })

  // At zoom 10, 1 px is 1/728 degrees of longitude.
  const PX = 1 / 728
  const farmAt = (id: string, px: number, dy = 0) => {
    const lng = 36.08 + px * PX
    const lat = -0.3 - dy * PX
    return {
      id,
      boundary: [
        [lat, lng],
        [lat, lng + 0.0001],
        [lat - 0.0001, lng + 0.0001],
      ] as LatLng[],
      color: '#2f9e5a',
      label: id,
    }
  }
  const tooltip = (container: HTMLElement, id: string) =>
    Array.from(
      container.querySelectorAll<HTMLElement>('.leaflet-tooltip'),
    ).find((el) => el.textContent === id)!
  const draw = (...farms: ReturnType<typeof farmAt>[]) =>
    render(
      <FarmMap
        zoom={10}
        pinsBelowZoom={14}
        center={[-0.3, 36.08]}
        polygons={farms}
      />,
    ).container

  test('a label that would leave the map flips to the pin left', () => {
    const c = draw(farmAt('Edge', 120))
    const tip = tooltip(c, 'Edge')
    expect(tip).toHaveClass('leaflet-tooltip-left')
    expect(tip.style.visibility).not.toBe('hidden')
  })

  test('a label in the clear stays on the right', () => {
    const tip = tooltip(draw(farmAt('Mid', 0)), 'Mid')
    expect(tip).toHaveClass('leaflet-tooltip-right')
  })

  test('a colliding label flips left instead of hiding', () => {
    const c = draw(farmAt('A', 40), farmAt('B', -30))
    expect(tooltip(c, 'A')).toHaveClass('leaflet-tooltip-right')
    const b = tooltip(c, 'B')
    expect(b).toHaveClass('leaflet-tooltip-left')
    expect(b.style.visibility).not.toBe('hidden')
  })

  // Pins P1/P2 sit just below-right and below-left of A, so A's right and left
  // labels would cover them; nothing is above A, so top is free.
  const blockSides = [farmAt('P1', 60, 12), farmAt('P2', -60, 12)]

  test('when right and left both fail, the label goes on top', () => {
    const c = draw(farmAt('A', 0), ...blockSides)
    const a = tooltip(c, 'A')
    expect(a).toHaveClass('leaflet-tooltip-top')
    expect(a.style.visibility).not.toBe('hidden')
  })

  test('a label is hidden only when right, left, top and bottom all fail', () => {
    const c = draw(
      farmAt('A', 0),
      ...blockSides,
      farmAt('Above', 0, -40),
      farmAt('Below', 0, 50),
    )
    const a = tooltip(c, 'A')
    expect(a.style.visibility).toBe('hidden')
    // reset to the default side, so no failed spot leaks into the next redraw
    expect(a).toHaveClass('leaflet-tooltip-right')
    expect(c.querySelectorAll('path.farm-pin')).toHaveLength(5)
  })

  test('a label never covers another farm pin', () => {
    // Pin P sits where A's right-hand label would go; A moves to the left.
    const c = draw(farmAt('A', 0), farmAt('P', 60))
    expect(tooltip(c, 'A')).toHaveClass('leaflet-tooltip-left')
  })
})

describe('first draw', () => {
  const west = [-0.3, 36.08] as LatLng
  const farmsKmApart = [
    {
      id: 'W',
      boundary: [west, [-0.3, 36.0809], [-0.3009, 36.0809]] as LatLng[],
      color: '#2f9e5a',
      label: 'W',
    },
    {
      id: 'E',
      boundary: [
        [-0.3, 36.12],
        [-0.3, 36.1209],
        [-0.3009, 36.1209],
      ] as LatLng[],
      color: '#2f9e5a',
      label: 'E',
    },
  ]
  const fitTo = farmsKmApart.flatMap((f) => f.boundary)

  test('farms a few km apart draw pins on the very first render', () => {
    // Initial zoom 16 is within 4 of the fit zoom, where Leaflet would animate.
    const { container } = render(
      <FarmMap
        zoom={16}
        pinsBelowZoom={14}
        fitTo={fitTo}
        polygons={farmsKmApart}
      />,
    )
    expect(container.querySelectorAll('path.farm-pin')).toHaveLength(2)
    expect(
      container.querySelectorAll(
        'path.leaflet-interactive:not(.farm-pin):not(.farm-pin-hit)',
      ),
    ).toHaveLength(0)
  })

  test('fits without animation, once on mount, and again when fitTo changes', () => {
    let proto: { fitBounds: (...a: unknown[]) => unknown } | undefined
    const probe = render(
      <FarmMap
        onReady={(m) => {
          proto = Object.getPrototypeOf(m)
        }}
      />,
    )
    probe.unmount()
    const spy = vi.spyOn(proto!, 'fitBounds')
    const view = render(<FarmMap zoom={16} fitTo={fitTo} />)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][1]).toMatchObject({ animate: false })
    view.rerender(<FarmMap zoom={16} fitTo={fitTo.slice(0, 3)} />)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][1]).toMatchObject({ animate: false })
    spy.mockRestore()
  })
})
