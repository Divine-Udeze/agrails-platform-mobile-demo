import type { LatLng } from '@/src/types'
import {
  boundsOf,
  centroid,
  distanceMeters,
  isSelfIntersecting,
  pathLengthMeters,
  polygonAreaHa,
  simplifyPath,
  squareAround,
  validateBoundary,
} from '@/src/utils/geo'

const NAKURU: LatLng = [-0.3031, 36.08]

test('squareAround produces a polygon of the requested area', () => {
  expect(polygonAreaHa(squareAround(NAKURU, 1))).toBeCloseTo(1, 2)
  expect(polygonAreaHa(squareAround(NAKURU, 0.5))).toBeCloseTo(0.5, 2)
})

test('area ignores vertex order and needs 3+ points', () => {
  const sq = squareAround(NAKURU, 2)
  expect(polygonAreaHa([...sq].reverse())).toBeCloseTo(2, 2)
  expect(polygonAreaHa(sq.slice(0, 2))).toBe(0)
})

test('distance of one degree of latitude is about 111 km', () => {
  expect(Math.abs(distanceMeters([0, 36], [1, 36]) - 111319)).toBeLessThan(50)
})

test('path length sums segment distances', () => {
  const p: LatLng[] = [
    [0, 36],
    [0.001, 36],
    [0.002, 36],
  ]
  expect(pathLengthMeters(p)).toBeCloseTo(distanceMeters(p[0], p[2]), 0)
})

test('centroid of a square is its centre', () => {
  const c = centroid(squareAround(NAKURU, 1))
  expect(c[0]).toBeCloseTo(NAKURU[0], 6)
  expect(c[1]).toBeCloseTo(NAKURU[1], 6)
})

test('detects a bow-tie as self-intersecting', () => {
  const [a, b, c, d] = squareAround(NAKURU, 1)
  expect(isSelfIntersecting([a, b, c, d])).toBe(false)
  expect(isSelfIntersecting([a, c, b, d])).toBe(true)
})

test('validateBoundary reports the first problem', () => {
  const sq = squareAround(NAKURU, 1)
  expect(validateBoundary(sq.slice(0, 2))).toEqual({
    ok: false,
    reason: 'too_few_points',
  })
  const [a, b, c, d] = sq
  expect(validateBoundary([a, c, b, d])).toEqual({
    ok: false,
    reason: 'self_intersecting',
  })
  expect(validateBoundary(squareAround(NAKURU, 0.01))).toEqual({
    ok: false,
    reason: 'too_small',
  })
  expect(validateBoundary(squareAround(NAKURU, 60))).toEqual({
    ok: false,
    reason: 'too_large',
  })
  const ok = validateBoundary(sq)
  expect(ok.ok).toBe(true)
  if (ok.ok) expect(ok.areaHa).toBeCloseTo(1, 2)
})

test('simplifyPath drops near-collinear points but keeps corners', () => {
  const wobbly: LatLng[] = [
    [0, 36],
    [0.0001, 36.000001],
    [0.0002, 35.999999],
    [0.0003, 36],
  ]
  expect(simplifyPath(wobbly, 2)).toEqual([wobbly[0], wobbly[3]])
  const corner: LatLng[] = [
    [0, 36],
    [0.0005, 36],
    [0.001, 36],
    [0.001, 36.0005],
    [0.001, 36.001],
  ]
  expect(simplifyPath(corner, 2)).toEqual([corner[0], corner[2], corner[4]])
})

test('boundsOf returns south-west and north-east corners', () => {
  expect(
    boundsOf([
      [1, 36],
      [-1, 37],
      [0, 35],
    ]),
  ).toEqual([
    [-1, 35],
    [1, 37],
  ])
})
