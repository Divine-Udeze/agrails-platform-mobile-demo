import {
  arcPath,
  clamp,
  extent,
  linearScale,
  niceTicks,
  polar,
  svgId,
} from '@/src/components/charts/scale'

test('linearScale maps domain to range', () => {
  const s = linearScale([0, 10], [100, 0])
  expect(s(0)).toBe(100)
  expect(s(5)).toBe(50)
  expect(linearScale([3, 3], [0, 10])(3)).toBe(0)
})

test('niceTicks uses 1/2/5 steps', () => {
  expect(niceTicks(0, 40)).toEqual([0, 10, 20, 30, 40])
  expect(niceTicks(0.23, 0.78)).toEqual([0.2, 0.4, 0.6, 0.8])
  expect(niceTicks(5, 5)).toEqual([5])
})

test('extent pads and handles flat data', () => {
  expect(extent([0, 10], 0.1)).toEqual([-1, 11])
  expect(extent([4, 4])).toEqual([3, 5])
})

test('clamp', () => {
  expect(clamp(5, 0, 1)).toBe(1)
  expect(clamp(-5, 0, 1)).toBe(0)
})

test('polar measures clockwise from 12 o clock', () => {
  const [x, y] = polar(50, 50, 40, Math.PI / 2)
  expect(x).toBeCloseTo(90)
  expect(y).toBeCloseTo(50)
})

test('arcPath draws a clockwise SVG arc', () => {
  expect(arcPath(50, 50, 40, 0, Math.PI / 2)).toBe(
    'M 50.00 10.00 A 40 40 0 0 1 90.00 50.00',
  )
})

test('svgId strips characters that break url(#id)', () => {
  expect(svgId(':r1:')).toBe('r1')
})
