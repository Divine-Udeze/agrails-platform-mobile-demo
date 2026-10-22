import { t } from '@/src/i18n'

test('returns the English string for a key', () => {
  expect(t('crop.maize')).toBe('Maize')
})

test('fills {placeholders} from vars', () => {
  expect(t('common.hello', { name: 'Wanjiru' })).toBe('Hello, Wanjiru')
})

test('leaves unknown placeholders untouched', () => {
  expect(t('common.hello')).toBe('Hello, {name}')
})
