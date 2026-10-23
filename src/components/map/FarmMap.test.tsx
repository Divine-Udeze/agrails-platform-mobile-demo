import { StrictMode } from 'react'
import { render } from '@testing-library/react'
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
