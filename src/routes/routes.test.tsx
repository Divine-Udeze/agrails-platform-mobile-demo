import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
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

function GoTo({ to }: { to: string }) {
  const navigate = useNavigate()
  return (
    <button type='button' onClick={() => navigate(to)}>
      go to {to}
    </button>
  )
}

test('after logging out the guards keep the farmer out of /home', async () => {
  const user = userEvent.setup()
  render(
    <AppProvider initialState={seededState()}>
      <MemoryRouter
        initialEntries={['/profile']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Where />
        <GoTo to='/home' />
        <AppRoutes />
      </MemoryRouter>
    </AppProvider>,
  )
  await user.click(await screen.findByRole('button', { name: 'Log out' }))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Log out' }),
  )
  await waitFor(() =>
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/),
  )
  await user.click(screen.getByRole('button', { name: 'go to /home' }))
  await waitFor(() =>
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/),
  )
  expect(screen.queryByText('Wanjiru Kamau')).not.toBeInTheDocument()
})

test('the profile, policies and policy routes render real pages', async () => {
  renderAt('/policy/policy-maize', seededState())
  expect(await screen.findByText('AGR-2026-004417')).toBeInTheDocument()
})
