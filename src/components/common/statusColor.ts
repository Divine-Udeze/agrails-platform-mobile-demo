import type { Status } from '@/src/types'

/** Literal colours for places CSS variables cannot reach (Leaflet paths, SVG fills). */
export const STATUS_COLOR: Record<Status, string> = {
  good: '#2f9e5a',
  warning: '#c77700',
  danger: '#c62828',
}
