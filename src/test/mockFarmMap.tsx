import { useEffect, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type { FarmMapProps } from '@/src/components/map/FarmMap'
import type { LatLng } from '@/src/types'
import { squareAround } from '@/src/utils/geo'

/** NW, NE, SE, SW corners of a 1 ha square in Nakuru */
export const TEST_SQUARE: LatLng[] = squareAround([-0.3031, 36.08], 1)

/** The fake map handed to onReady, so pages can be tested without Leaflet. */
export const fakeMap = {
  dragging: { enable: vi.fn(), disable: vi.fn() },
  setView: vi.fn(),
  fitBounds: vi.fn(),
  flyTo: vi.fn(),
  // 1 px is about 1.1 m: a 100 px square is just over 1 ha.
  containerPointToLatLng: ([x, y]: [number, number]) => ({
    lat: -0.3031 - y * 0.00001,
    lng: 36.08 + x * 0.00001,
  }),
}

export function FarmMap(props: FarmMapProps) {
  const taps = useRef(0)
  const onReady = props.onReady
  useEffect(() => {
    onReady?.(fakeMap as unknown as LeafletMap)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div
      data-testid='farm-map'
      data-draft={props.draft?.length ?? 0}
      data-path={props.path?.length ?? 0}
      data-polygons={props.polygons?.length ?? 0}
    >
      {props.onMapClick && (
        <button
          type='button'
          onClick={() => props.onMapClick!(TEST_SQUARE[taps.current++ % 4])}
        >
          map-tap
        </button>
      )}
      {props.onTileError && (
        <button type='button' onClick={props.onTileError}>
          tile-error
        </button>
      )}
      {props.polygons?.map((p) => (
        <button key={p.id} type='button' onClick={p.onClick}>
          {p.label ?? p.id}
        </button>
      ))}
    </div>
  )
}
