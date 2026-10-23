import {
  acresToHa,
  formatAcres,
  formatDate,
  formatHa,
  formatKES,
  formatNumber,
  formatPhone,
  formatShortDate,
  groupLocalPhone,
  haToAcres,
  maskPhone,
  noWrap,
  todayISO,
} from '@/src/utils/format'

test('formats KES with thousands separators and no decimals', () => {
  expect(formatKES(12500)).toBe('KES\u00a012,500')
  expect(formatKES(1234.6)).toBe('KES\u00a01,235')
  expect(formatKES(0)).toBe('KES\u00a00')
})

test('converts between hectares and acres', () => {
  expect(haToAcres(1)).toBeCloseTo(2.47105, 4)
  expect(acresToHa(2.47105)).toBeCloseTo(1, 4)
})

test('formats areas compactly', () => {
  expect(formatHa(1.2)).toBe('1.2 ha')
  expect(formatHa(0.8123)).toBe('0.81 ha')
  expect(formatAcres(1)).toBe('2.5 acres')
})

test('formats ISO dates for farmers', () => {
  expect(formatDate('2026-03-15T00:00:00.000Z')).toBe('15 Mar 2026')
  expect(formatShortDate('2026-03-15T00:00:00.000Z')).toBe('15 Mar')
})

test('formats Kenyan phone numbers in groups', () => {
  expect(formatPhone('+254712345678')).toBe('+254 712 345 678')
})

test.each([
  ['712345678', '712 345 678'],
  ['0712345678', '0712 345 678'],
  ['+254712345678', '712 345 678'],
  ['7123', '712 3'],
  ['71234567890', '712 345 678'],
])('groupLocalPhone(%s)', (input, expected) => {
  expect(groupLocalPhone(input)).toBe(expected)
})

test('maskPhone hides the middle digits of the phone on file', () => {
  expect(maskPhone('+254712345678')).toBe('+254 7•• ••• 678')
  expect(maskPhone('+254722111222')).toBe('+254 7•• ••• 222')
})

test('todayISO uses local date parts', () => {
  expect(todayISO(new Date(2026, 9, 23, 1, 30))).toBe('2026-10-23')
  expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
})

test('formats plain numbers with grouping', () => {
  expect(formatNumber(12500)).toBe('12,500')
  expect(formatNumber(999.6)).toBe('1,000')
  expect(formatNumber(0)).toBe('0')
})

describe('formatKES', () => {
  test('keeps KES and the amount together with a non-breaking space', () => {
    expect(formatKES(10800)).toBe('KES\u00a010,800')
    expect(formatKES(10800)).not.toContain(' ')
  })
})

test('noWrap turns every space into a non-breaking space', () => {
  expect(noWrap('1 Mar 2026')).toBe('1\u00a0Mar\u00a02026')
})
