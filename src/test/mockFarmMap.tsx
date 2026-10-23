import { useRef } from 'react'
import type { FarmMapProps } from '@/src/components/map/FarmMap'
import type { LatLng } from '@/src/types'
import { squareAround } from '@/src/utils/geo'

/** NW, NE, SE, SW corners of a 1 ha square in Nakuru */
export const TEST_SQUARE: LatLng[] = squareAround([-0.3031, 36.08], 1)

export function FarmMap(props: FarmMapProps) {
  const taps = useRef(0)
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
