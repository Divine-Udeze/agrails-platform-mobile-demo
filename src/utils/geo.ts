import { BOUNDARY_LIMITS } from '@/src/data/cropConfig'
import type { LatLng } from '@/src/types'

const R = 6378137
/** Metres per degree of latitude on the sphere used for area/distance */
export const M_PER_DEG = (R * Math.PI) / 180

const rad = (deg: number) => (deg * Math.PI) / 180

/** Spherical polygon area (same formula as Leaflet.draw / turf), in hectares. */
export function polygonAreaHa(boundary: LatLng[]): number {
  if (boundary.length < 3) return 0
  let total = 0
  for (let i = 0; i < boundary.length; i++) {
    const [lat1, lng1] = boundary[i]
    const [lat2, lng2] = boundary[(i + 1) % boundary.length]
    total += rad(lng2 - lng1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)))
  }
  return Math.abs((total * R * R) / 2) / 10000
}

export function squareAround(center: LatLng, areaHa: number): LatLng[] {
  const half = Math.sqrt(areaHa * 10000) / 2
  const dLat = half / M_PER_DEG
  const dLng = half / (M_PER_DEG * Math.cos(rad(center[0])))
  const [lat, lng] = center
  return [
    [lat + dLat, lng - dLng],
    [lat + dLat, lng + dLng],
    [lat - dLat, lng + dLng],
    [lat - dLat, lng - dLng],
  ]
}

export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0])
  const dLng = rad(b[1] - a[1])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function pathLengthMeters(points: LatLng[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++)
    total += distanceMeters(points[i - 1], points[i])
  return total
}

export function centroid(points: LatLng[]): LatLng {
  const n = points.length || 1
  const lat = points.reduce((s, p) => s + p[0], 0) / n
  const lng = points.reduce((s, p) => s + p[1], 0) / n
  return [lat, lng]
}

export function boundsOf(points: LatLng[]): [LatLng, LatLng] {
  const lats = points.map((p) => p[0])
  const lngs = points.map((p) => p[1])
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ]
}

/** Projects to local metres (x east, y north) around the first point. */
function toXY(points: LatLng[]): [number, number][] {
  const origin = points[0]
  const kx = M_PER_DEG * Math.cos(rad(origin[0]))
  return points.map(([lat, lng]) => [
    (lng - origin[1]) * kx,
    (lat - origin[0]) * M_PER_DEG,
  ])
}

function orient(a: number[], b: number[], c: number[]): number {
  return Math.sign(
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
  )
}

function segmentsCross(
  p1: number[],
  p2: number[],
  p3: number[],
  p4: number[],
): boolean {
  const o1 = orient(p1, p2, p3)
  const o2 = orient(p1, p2, p4)
  const o3 = orient(p3, p4, p1)
  const o4 = orient(p3, p4, p2)
  return o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0
}

export function isSelfIntersecting(boundary: LatLng[]): boolean {
  const n = boundary.length
  if (n < 4) return false
  const xy = toXY(boundary)
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue // adjacent through the closing edge
      if (segmentsCross(xy[i], xy[(i + 1) % n], xy[j], xy[(j + 1) % n]))
        return true
    }
  }
  return false
}

export type BoundaryError =
  'too_few_points' | 'self_intersecting' | 'too_small' | 'too_large'
export type BoundaryCheck =
  { ok: true; areaHa: number } | { ok: false; reason: BoundaryError }

export function validateBoundary(boundary: LatLng[]): BoundaryCheck {
  if (boundary.length < 3) return { ok: false, reason: 'too_few_points' }
  if (isSelfIntersecting(boundary))
    return { ok: false, reason: 'self_intersecting' }
  const areaHa = polygonAreaHa(boundary)
  if (areaHa < BOUNDARY_LIMITS.minHa) return { ok: false, reason: 'too_small' }
  if (areaHa > BOUNDARY_LIMITS.maxHa) return { ok: false, reason: 'too_large' }
  return { ok: true, areaHa }
}

function perpendicularDistance(p: number[], a: number[], b: number[]): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy)
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len
}

/** Douglas–Peucker simplification with a tolerance in metres. */
export function simplifyPath(points: LatLng[], toleranceM: number): LatLng[] {
  if (points.length <= 2) return points
  const xy = toXY(points)
  const keep = new Array<boolean>(points.length).fill(false)
  keep[0] = true
  keep[points.length - 1] = true
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length) {
    const [start, end] = stack.pop()!
    let maxDist = 0
    let index = -1
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistance(xy[i], xy[start], xy[end])
      if (d > maxDist) {
        maxDist = d
        index = i
      }
    }
    if (index !== -1 && maxDist > toleranceM) {
      keep[index] = true
      stack.push([start, index], [index, end])
    }
  }
  return points.filter((_, i) => keep[i])
}
