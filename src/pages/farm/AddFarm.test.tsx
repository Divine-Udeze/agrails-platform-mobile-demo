import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { STATE_KEY } from '@/src/context/persistence'
import AddFarm from '@/src/pages/farm/AddFarm'
import * as farmService from '@/src/services/farmService'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

afterEach(() => vi.restoreAllMocks())

async function toSave(user: ReturnType<typeof renderWithApp>['user']) {
  for (let i = 0; i < 3; i++)
    await user.click(screen.getByRole('button', { name: 'Next' }))
}

const edit = {
  route: '/edit-farm/farm-maize',
  path: '/edit-farm/:farmId',
}

test('add flow validates each step and ends at boundary intro', async () => {
  const { user } = renderWithApp(<AddFarm />, {
    route: '/add-farm',
    path: '/add-farm',
    state: seededState(),
  })
  expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Give your farm a name')
  await user.type(screen.getByLabelText('Farm name'), 'River plot')
  await user.click(screen.getByRole('button', { name: 'Next' }))

  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a crop')
  await user.click(screen.getByRole('radio', { name: /beans/i }))
  await user.click(screen.getByRole('button', { name: 'Next' }))

  await user.click(screen.getByRole('radio', { name: /short rains/i }))
  await user.click(screen.getByRole('button', { name: 'Next' }))

  expect(screen.getByText('Step 4 of 4')).toBeInTheDocument()
  await user.clear(screen.getByLabelText('Planting date'))
  await user.type(screen.getByLabelText('Planting date'), '2026-10-12')
  await user.click(screen.getByRole('button', { name: 'Next: mark your farm' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/boundary-intro')
  expect(localStorage.getItem(STATE_KEY)).toContain('River plot')
})

test('edit flow is prefilled and saves the farm', async () => {
  const { user } = renderWithApp(<AddFarm />, {
    route: '/edit-farm/farm-maize',
    path: '/edit-farm/:farmId',
    state: seededState(),
  })
  const name = screen.getByLabelText('Farm name')
  expect(name).toHaveValue('Lower Shamba')
  await user.clear(name)
  await user.type(name, 'Upper Shamba')
  for (let i = 0; i < 3; i++)
    await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByTestId('location')).toHaveTextContent(
    '/farm/farm-maize',
  )
  expect(localStorage.getItem(STATE_KEY)).toContain('Upper Shamba')
})

test('saving an edit leaves the farm form reset', async () => {
  const { user } = renderWithApp(<AddFarm />, {
    route: '/edit-farm/farm-maize',
    path: '/edit-farm/:farmId',
    state: seededState(),
  })
  for (let i = 0; i < 3; i++)
    await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/farm/farm-maize',
    ),
  )
  await waitFor(() => {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? '{}')
    expect(saved.farmForm.editingFarmId).toBeNull()
    expect(saved.farmForm.name).toBe('')
  })
})

test('editing an unknown farm shows Not Found', () => {
  renderWithApp(<AddFarm />, {
    route: '/edit-farm/nope',
    path: '/edit-farm/:farmId',
    state: seededState(),
  })
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})

test('a failed save shows an error, keeps the form and re-enables the button', async () => {
  vi.spyOn(farmService, 'updateFarm').mockRejectedValue(new Error('boom'))
  const { user } = renderWithApp(<AddFarm />, { ...edit, state: seededState() })
  await toSave(user)
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    "We couldn't save your changes. Please try again.",
  )
  expect(screen.queryByTestId('location')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
  const saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? '{}')
  expect(saved.farmForm.editingFarmId).toBe('farm-maize')
})

test('double-tapping Save changes saves once', async () => {
  const spy = vi
    .spyOn(farmService, 'updateFarm')
    .mockImplementation(() => new Promise(() => {}))
  const { user } = renderWithApp(<AddFarm />, { ...edit, state: seededState() })
  await toSave(user)
  const save = screen.getByRole('button', { name: 'Save changes' })
  act(() => {
    fireEvent.click(save)
    fireEvent.click(save)
  })
  expect(spy).toHaveBeenCalledTimes(1)
})
