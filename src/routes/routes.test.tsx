import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AppRoutes } from '@/src/App'
import { AppProvider } from '@/src/context/AppContext'
import { initialState } from '@/src/context/reducer'
import { seededState } from '@/src/test/renderWithApp'
import type { AppState } from '@/src/types'

function Where() {
  const loc = useLocation()
  return <div data-testid='where'>{loc.pathname}</div>
}

function renderAt(route: string, state: AppState) {
  render(
    <AppProvider initialState={state}>
      <MemoryRouter
        initialEntries={[route]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Where />
        <AppRoutes />
      </MemoryRouter>
    </AppProvider>,
  )
}

const newUser: AppState = {
  ...initialState,
  auth: { isAuthenticated: true, phone: '+254700000001', isNewUser: true },
}

test('logged-out users are sent to the welcome screen', async () => {
  renderAt('/home', initialState)
  await waitFor(() =>
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/),
  )
})

test('logged-in farmers skip onboarding', async () => {
  renderAt('/phone-entry', seededState())
  await waitFor(() =>
    expect(screen.getByTestId('where')).toHaveTextContent('/home'),
  )
})

test('new users must finish registration first', async () => {
  renderAt('/home', newUser)
  await waitFor(() =>
    expect(screen.getByTestId('where')).toHaveTextContent('/registration'),
  )
})

test('registered farmers cannot reopen registration', async () => {
  renderAt('/registration', seededState())
  await waitFor(() =>
    expect(screen.getByTestId('where')).toHaveTextContent('/home'),
  )
})

test('unknown paths show Not Found', async () => {
  renderAt('/no-such-page', seededState())
  expect(
    await screen.findByText("We couldn't find that page"),
  ).toBeInTheDocument()
})
