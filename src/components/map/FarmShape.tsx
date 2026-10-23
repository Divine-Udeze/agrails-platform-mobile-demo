import { STATUS_COLOR } from '@/src/components/common/statusColor'
import type { LatLng, Status } from '@/src/types'
import { boundsOf } from '@/src/utils/geo'

interface Props {
  boundary: LatLng[]
  status?: Status
  size?: number
  /** omit to make the shape decorative */
  label?: string
}

/** Lightweight farm outline for cards and lists — no map tiles needed. */
export function FarmShape({
  boundary,
  status = 'good',
  size = 64,
  label,
}: Props) {
  if (boundary.length < 3) return null
  const [sw, ne] = boundsOf(boundary)
  const kx = Math.cos((sw[0] * Math.PI) / 180)
  const w = (ne[1] - sw[1]) * kx
  const h = ne[0] - sw[0]
  const span = Math.max(w, h) || 1
  const points = boundary
    .map(([lat, lng]) => {
      const x = 14 + 72 * (((lng - sw[1]) * kx + (span - w) / 2) / span)
      const y = 14 + 72 * ((ne[0] - lat + (span - h) / 2) / span)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const color = STATUS_COLOR[status]
  return (
    <svg
      viewBox='0 0 100 100'
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-status={status}
    >
      <rect width='100' height='100' rx='18' fill='#f4ece3' />
      {[20, 35, 50, 65, 80].map((y) => (
        <line
          key={y}
          x1='8'
          x2='92'
          y1={y}
          y2={y}
          stroke='#e6d8c6'
          strokeWidth='3'
          strokeLinecap='round'
        />
      ))}
      <polygon
        points={points}
        fill={color}
        fillOpacity='0.35'
        stroke={color}
        strokeWidth='4'
        strokeLinejoin='round'
      />
    </svg>
  )
}
