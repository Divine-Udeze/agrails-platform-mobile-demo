import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { STATE_KEY } from '@/src/context/persistence'
import PayoutDetails from '@/src/pages/payout/PayoutDetails'
import PayoutHistory from '@/src/pages/payout/PayoutHistory'
import { ProgressTimeline } from '@/src/components/common/ProgressTimeline'
import { stageSteps } from '@/src/pages/payout/stages'
import PayoutNotification from '@/src/pages/payout/PayoutNotification'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'
import { buildAccounts } from '@/src/data/mockData'
import { initialState } from '@/src/context/reducer'
import type { AppState } from '@/src/types'

const css = readFileSync('src/pages/payout/payout.module.css', 'utf8')

const dispatchSpy = vi.hoisted(() => vi.fn())
vi.mock('@/src/context/AppContext', async (orig) => {
  const m = await orig<typeof import('@/src/context/AppContext')>()
  return {
    ...m,
    useApp: () => {
      const a = m.useApp()
      return {
        ...a,
        dispatch: (action: Parameters<typeof a.dispatch>[0]) => {
          dispatchSpy(action)
          a.dispatch(action)
        },
      }
    },
  }
})

/** keep non-breaking spaces (the default matcher folds them into plain spaces) */
const RAW = { normalizer: (s: string) => s }

beforeEach(() => dispatchSpy.mockClear())

const NOTIFY = {
  route: '/payout/payout-beans',
  path: '/payout/:payoutId',
}
const DETAILS = {
  route: '/payout-details/payout-beans',
  path: '/payout-details/:payoutId',
}

const stateFor = (phone: string): AppState => {
  const data = buildAccounts().find((a) => a.farmer.phone === phone)!
  return {
    ...initialState,
    auth: { isAuthenticated: true, phone, isNewUser: false },
    ...data,
  }
}

test('notification celebrates, marks the payout read and links to details', async () => {
  const { user } = renderWithApp(<PayoutNotification />, {
    ...NOTIFY,
    state: seededState(),
  })
  expect(screen.getByText('Good news, Wanjiru!')).toBeInTheDocument()
  expect(screen.getByText('KES 10,800', RAW)).toBeInTheDocument()
  expect(
    screen.getByText('Harvests in Machakos were 55% below normal this season.'),
  ).toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem(STATE_KEY)!).payouts[0].read).toBe(
    true,
  )
  await user.click(screen.getByRole('button', { name: 'See details' }))
  expect(screen.getByTestId('location')).toHaveTextContent(
    '/payout-details/payout-beans',
  )
})

test('opening an unread payout dispatches MARK_PAYOUT_READ exactly once', () => {
  renderWithApp(<PayoutNotification />, { ...NOTIFY, state: seededState() })
  const marks = dispatchSpy.mock.calls.filter(
    ([a]) => a.type === 'MARK_PAYOUT_READ',
  )
  expect(marks).toEqual([
    [{ type: 'MARK_PAYOUT_READ', payoutId: 'payout-beans' }],
  ])
})

test('an already-read payout is not marked again', () => {
  renderWithApp(<PayoutNotification />, {
    route: '/payout/payout-ach',
    path: '/payout/:payoutId',
    state: stateFor('+254733444555'),
  })
  expect(screen.getByText('Good news, Achieng!')).toBeInTheDocument()
  expect(dispatchSpy).not.toHaveBeenCalled()
})

test('details explain the shortfall with a chart and progress', () => {
  renderWithApp(<PayoutDetails />, { ...DETAILS, state: seededState() })
  expect(
    screen.getByRole('img', {
      name: 'Normal harvest compared with this season',
    }),
  ).toBeInTheDocument()
  expect(
    screen.getByText(/This season it was 45% of normal/),
  ).toBeInTheDocument()
  expect(screen.getByText('15 points')).toBeInTheDocument()
  const states = screen
    .getAllByRole('listitem')
    .map((li) => li.getAttribute('data-state'))
  expect(states).toEqual(['done', 'done', 'done', 'current'])
})

test('details show money with a non-breaking space', () => {
  renderWithApp(<PayoutDetails />, { ...DETAILS, state: seededState() })
  expect(screen.getAllByText('KES 10,800', RAW).length).toBeGreaterThan(0)
  expect(screen.queryByText('KES 10,800', RAW)).toBeNull()
})

test('a fully sent payout shows every stage done', () => {
  renderWithApp(<PayoutDetails />, {
    route: '/payout-details/payout-ach',
    path: '/payout-details/:payoutId',
    state: stateFor('+254733444555'),
  })
  const states = screen
    .getAllByRole('listitem')
    .map((li) => li.getAttribute('data-state'))
  expect(states).toEqual(['done', 'done', 'done', 'done'])
})

test('details also clear the unread flag', () => {
  renderWithApp(<PayoutDetails />, { ...DETAILS, state: seededState() })
  expect(JSON.parse(localStorage.getItem(STATE_KEY)!).payouts[0].read).toBe(
    true,
  )
})

test.each([
  ['/payout/nope', <PayoutNotification />, '/payout/:payoutId'],
  ['/payout-details/nope', <PayoutDetails />, '/payout-details/:payoutId'],
])('unknown payout %s shows Not Found', (route, ui, path) => {
  renderWithApp(ui, { route, path, state: seededState() })
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})

test.each([
  ['farm', { farms: [] }],
  ['policy', { policies: [] }],
])('a payout whose %s was removed shows Not Found', (_n, patch) => {
  renderWithApp(<PayoutDetails />, {
    ...DETAILS,
    state: { ...seededState(), ...patch },
  })
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})

test('notification with its farm removed shows Not Found', () => {
  renderWithApp(<PayoutNotification />, {
    ...NOTIFY,
    state: { ...seededState(), farms: [] },
  })
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})

test('history totals payouts and links to each', () => {
  renderWithApp(<PayoutHistory />, {
    route: '/payouts',
    path: '/payouts',
    state: seededState(),
  })
  expect(screen.getByText('Total payouts')).toBeInTheDocument()
  const link = screen.getByRole('link', { name: /Machakos Plot/ })
  expect(link).toHaveAttribute('href', '/payout-details/payout-beans')
  expect(within(link).getByText('Payout approved')).toHaveAttribute(
    'data-status',
    'warning',
  )
})

test('history shows a sent payout with the good status', () => {
  renderWithApp(<PayoutHistory />, {
    route: '/payouts',
    path: '/payouts',
    state: stateFor('+254733444555'),
  })
  expect(screen.getByText('Sent to M-Pesa')).toHaveAttribute(
    'data-status',
    'good',
  )
  expect(screen.getByText('19 Sep 2026')).toBeInTheDocument()
})

test('history lists the newest payout first', () => {
  const s = seededState()
  const older = {
    ...s.payouts[0],
    id: 'payout-old',
    stageDates: { triggered: '2025-01-01T00:00:00.000Z' },
  }
  renderWithApp(<PayoutHistory />, {
    route: '/payouts',
    path: '/payouts',
    state: { ...s, payouts: [older, s.payouts[0]] },
  })
  const hrefs = screen
    .getAllByRole('link')
    .map((l) => l.getAttribute('href'))
    .filter((h) => h?.startsWith('/payout-details'))
  expect(hrefs).toEqual([
    '/payout-details/payout-beans',
    '/payout-details/payout-old',
  ])
})

test('history empty state', () => {
  renderWithApp(<PayoutHistory />, {
    route: '/payouts',
    path: '/payouts',
    state: { ...seededState(), payouts: [] },
  })
  expect(screen.getByText('No payouts yet')).toBeInTheDocument()
  expect(screen.queryByText('Total payouts')).toBeNull()
})

test('the nav unread dot clears once the payout is opened', async () => {
  const { user } = renderWithApp(
    <Routes>
      <Route path='/payouts' element={<PayoutHistory />} />
      <Route path='/payout-details/:payoutId' element={<PayoutDetails />} />
    </Routes>,
    { route: '/payouts', path: '/*', state: seededState() },
  )
  expect(screen.getByRole('img', { name: 'New payout' })).toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: /Machakos Plot/ }))
  await user.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByText('Total payouts')).toBeInTheDocument()
  expect(screen.queryByRole('img', { name: 'New payout' })).toBeNull()
})

test('View policy link is a 48px tap target', () => {
  renderWithApp(<PayoutDetails />, { ...DETAILS, state: seededState() })
  expect(screen.getByRole('link', { name: 'View policy' }).className).toMatch(
    /policyLink/,
  )
  expect(css).toMatch(/\.policyLink\s*{[^}]*min-height:\s*var\(--tap\)/)
})

test('chart value labels use the i18n yield unit', () => {
  renderWithApp(<PayoutDetails />, { ...DETAILS, state: seededState() })
  const svg = screen.getByRole('img', {
    name: 'Normal harvest compared with this season',
  })
  expect(svg.querySelector('[data-value="Normal"]')).toHaveTextContent(
    '1.2 t/ha',
  )
  expect(svg.querySelector('[data-value="This season"]')).toHaveTextContent(
    '0.54 t/ha',
  )
})

test('the formatted phone never breaks mid-number', () => {
  renderWithApp(<PayoutNotification />, { ...NOTIFY, state: seededState() })
  expect(
    screen.getByText(/The money will be sent to your M-Pesa/, RAW).textContent,
  ).toBe('The money will be sent to your M-Pesa +254 712 345 678.')
})

test('Later goes home', async () => {
  const { user } = renderWithApp(<PayoutNotification />, {
    ...NOTIFY,
    state: seededState(),
  })
  await user.click(screen.getByRole('button', { name: 'Later' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/home')
})

test('history total for Wanjiru', () => {
  renderWithApp(<PayoutHistory />, {
    route: '/payouts',
    path: '/payouts',
    state: seededState(),
  })
  const total = screen.getByText('Total payouts').nextElementSibling
  expect(total?.textContent).toBe('KES 10,800')
})

test('history rows keep the farm name on one line and the tap card separate from the grid', () => {
  renderWithApp(<PayoutHistory />, {
    route: '/payouts',
    path: '/payouts',
    state: seededState(),
  })
  const link = screen.getByRole('link', { name: /Machakos Plot/ })
  expect(link).toHaveClass('card', 'card-tap')
  expect(link.className).not.toMatch(/item/)
  expect(link.firstElementChild?.className).toMatch(/item/)
  const name = screen.getByText('Machakos Plot')
  expect(name.className).toMatch(/name/)
  // status chip lives in the middle column; the right column is only the amount
  const middle = name.parentElement!
  expect(within(middle).getByText('Payout approved')).toBeInTheDocument()
  const right = middle.nextElementSibling!
  expect(right.textContent).toBe('KES\u00a010,800')
  expect(css).toMatch(
    /\.name\s*{[^}]*white-space:\s*nowrap[^}]*text-overflow:\s*ellipsis/,
  )
})

test('history shows a fallback when the farm is missing', () => {
  renderWithApp(<PayoutHistory />, {
    route: '/payouts',
    path: '/payouts',
    state: { ...seededState(), farms: [] },
  })
  expect(screen.getByText('Your farm')).toBeInTheDocument()
})

test('stageSteps with an unknown stage leaves every step pending', () => {
  const p = { ...seededState().payouts[0], stage: 'bogus' as never }
  const { steps, currentIndex } = stageSteps(p)
  expect(currentIndex).toBe(-1)
  const { container } = render(
    <ProgressTimeline steps={steps} currentIndex={currentIndex} />,
  )
  expect(
    [...container.querySelectorAll('li')].map((li) => li.dataset.state),
  ).toEqual(['pending', 'pending', 'pending', 'pending'])
})

test('the celebrate animation is covered by the global reduced-motion rule', () => {
  // jsdom cannot evaluate media queries, so assert on the stylesheets themselves
  const global = readFileSync('src/styles/global.css', 'utf8')
  const rule = global.match(
    /@media \(prefers-reduced-motion: reduce\)\s*{([\s\S]*?)\n}/,
  )![1]
  expect(rule).toMatch(/\*,/)
  expect(rule).toMatch(/animation:\s*none\s*!important/)
  expect(css).toMatch(/\.pop\s*{\s*animation:/)
  const frames = css.match(/@keyframes pop\s*{([\s\S]*?)\n}\n/)![1]
  expect(
    frames.replace(
      /transform|opacity|scale\([^)]*\)|[\d.]+|[{}:;\s]|from/g,
      '',
    ),
  ).toBe('')
})
