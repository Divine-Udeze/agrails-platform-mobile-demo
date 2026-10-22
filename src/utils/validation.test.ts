import {
  isValidName,
  isValidNationalId,
  isValidOtp,
  normalizeKenyanPhone,
} from '@/src/utils/validation'

test.each([
  ['712345678', '+254712345678'],
  ['0712345678', '+254712345678'],
  ['0712 345 678', '+254712345678'],
  ['0712-345-678', '+254712345678'],
  ['+254712345678', '+254712345678'],
  ['254712345678', '+254712345678'],
  ['110345678', '+254110345678'],
])('normalises %s', (input, expected) => {
  expect(normalizeKenyanPhone(input)).toBe(expected)
})

test.each(['', '12345', '812345678', '71234567', '7123456789', 'abc'])(
  'rejects %s',
  (input) => {
    expect(normalizeKenyanPhone(input)).toBeNull()
  },
)

test('national ID is 7 or 8 digits', () => {
  expect(isValidNationalId('1234567')).toBe(true)
  expect(isValidNationalId(' 12345678 ')).toBe(true)
  expect(isValidNationalId('123456')).toBe(false)
  expect(isValidNationalId('12345a78')).toBe(false)
})

test('name needs at least 3 non-space characters', () => {
  expect(isValidName('Ann')).toBe(true)
  expect(isValidName('  A ')).toBe(false)
})

test('OTP is exactly 6 digits', () => {
  expect(isValidOtp('123456')).toBe(true)
  expect(isValidOtp('12345')).toBe(false)
  expect(isValidOtp('12345a')).toBe(false)
})
