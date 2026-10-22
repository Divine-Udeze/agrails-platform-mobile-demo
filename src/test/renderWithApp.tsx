import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider } from '@/src/context/AppContext'
import { initialState } from '@/src/context/reducer'
import { buildSeedData } from '@/src/data/mockData'
import type { AppState } from '@/src/types'

export function seededState(): AppState {
  const data = buildSeedData()
  return {
    ...initialState,
    auth: { isAuthenticated: true, phone: data.farmer.phone, isNewUser: false },
    ...data,
  }
}

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid='location'>{loc.pathname + loc.search}</div>
}

export function renderWithApp(
  ui: ReactElement,
  {
    route = '/',
    path = '/',
    state,
  }: { route?: string; path?: string; state?: Partial<AppState> } = {},
) {
  const user = userEvent.setup()
  const result = render(
    <AppProvider initialState={{ ...initialState, ...state }}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path='*' element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </AppProvider>,
  )
  return { user, ...result }
}
