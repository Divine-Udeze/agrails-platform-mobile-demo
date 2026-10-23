import {
  acresToHa,
  formatAcres,
  formatDate,
  formatHa,
  formatKES,
  formatPhone,
  groupLocalPhone,
  maskPhone,
  formatShortDate,
  haToAcres,
} from '@/src/utils/format'

test('formats KES with thousands separators and no decimals', () => {
  expect(formatKES(12500)).toBe('KES 12,500')
  expect(formatKES(1234.6)).toBe('KES 1,235')
  expect(formatKES(0)).toBe('KES 0')
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
