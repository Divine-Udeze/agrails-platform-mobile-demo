import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Fragment, StrictMode, type ReactElement } from 'react'
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
    extra,
    strict = false,
  }: {
    route?: string | { pathname: string; state?: unknown }
    path?: string
    state?: Partial<AppState>
    /** rendered inside the router, beside the routes (e.g. a location logger) */
    extra?: ReactElement
    /** wrap the whole tree in StrictMode (double-invokes effects) */
    strict?: boolean
  } = {},
) {
  const user = userEvent.setup()
  const Wrap = strict ? StrictMode : Fragment
  const result = render(
    <Wrap>
      <AppProvider initialState={{ ...initialState, ...state }}>
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path={path} element={ui} />
            <Route path='*' element={<LocationProbe />} />
          </Routes>
          {extra}
        </MemoryRouter>
      </AppProvider>
    </Wrap>,
  )
  return { user, ...result }
}
