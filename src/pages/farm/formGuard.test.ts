import { emptyFarmForm } from '@/src/context/reducer'
import { requiredFormStep } from '@/src/pages/farm/formGuard'

test('sends incomplete forms back to the add-farm steps', () => {
  expect(requiredFormStep(emptyFarmForm)).toBe('/add-farm')
  expect(
    requiredFormStep({
      ...emptyFarmForm,
      name: 'A',
      crop: 'maize',
      season: 'long_rains',
    }),
  ).toBe('/add-farm')
})

test('complete details pass', () => {
  expect(
    requiredFormStep({
      ...emptyFarmForm,
      name: 'A',
      crop: 'maize',
      season: 'long_rains',
      plantingDate: '2026-10-01',
    }),
  ).toBeNull()
})
