import { screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { vi } from 'vitest'
import { AUTH_KEY } from '@/src/context/persistence'
import Policies from '@/src/pages/profile/Policies'
import PolicyDetail from '@/src/pages/profile/PolicyDetail'
import Profile from '@/src/pages/profile/Profile'
import {
  accountState,
  renderWithApp,
  seededState,
} from '@/src/test/renderWithApp'

const KIPKOECH = '+254722111222'
const ACHIENG = '+254733444555'

/** keep non-breaking spaces (the default matcher folds them into plain spaces) */
const RAW = { normalizer: (s: string) => s }

const PROFILE = { route: '/profile', path: '/profile' }
const POLICIES = { route: '/policies', path: '/policies' }
const detail = (id: string) => ({
  route: `/policy/${id}`,
  path: '/policy/:policyId',
})

// only Date is faked, so user-event and React keep their real timers
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-23T09:00:00.000Z'))
})
afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe('Profile', () => {
  test('shows the farmer and their counts', () => {
    renderWithApp(<Profile />, { ...PROFILE, state: seededState() })
    expect(screen.getByText('Wanjiru Kamau')).toBeInTheDocument()
    expect(screen.getByText('+254 712 345 678')).toBeInTheDocument()
    expect(screen.getByText('WK')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /My policies/ })).toHaveAttribute(
      'href',
      '/policies',
    )
    expect(screen.getByRole('link', { name: /My payouts/ })).toHaveAttribute(
      'href',
      '/payouts',
    )
  })

  test('language is information only: English is set, Kiswahili is coming soon', () => {
    renderWithApp(<Profile />, { ...PROFILE, state: seededState() })
    expect(screen.getByText('Language')).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Kiswahili — coming soon')).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /English|Kiswahili/ }),
    ).not.toBeInTheDocument()
  })

  test('help opens every answer in a sheet and Escape closes it', async () => {
    const { user } = renderWithApp(<Profile />, {
      ...PROFILE,
      state: seededState(),
    })
    await user.click(screen.getByRole('button', { name: 'Help' }))
    const dialog = screen.getByRole('dialog', { name: 'Help' })
    for (const q of [
      'What is area yield insurance?',
      'When do I get paid?',
      'What if only my farm has a problem?',
    ]) {
      expect(within(dialog).getByText(q)).toBeInTheDocument()
    }
    expect(
      within(dialog).getByText(/You do not need to make a claim/),
    ).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('one tap on Log out only asks for confirmation', async () => {
    const { user } = renderWithApp(<Profile />, {
      ...PROFILE,
      state: seededState(),
    })
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    const dialog = screen.getByRole('dialog', { name: 'Log out?' })
    expect(
      within(dialog).getByText(
        'You will need your phone number and a code to sign in again.',
      ),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'Log out' }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('location')).not.toBeInTheDocument()
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) expect(JSON.parse(stored).isAuthenticated).toBe(true)
  })

  test('cancel keeps the farmer signed in', async () => {
    const { user } = renderWithApp(<Profile />, {
      ...PROFILE,
      state: seededState(),
    })
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancel',
      }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Wanjiru Kamau')).toBeInTheDocument()
    expect(screen.queryByTestId('location')).not.toBeInTheDocument()
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) expect(JSON.parse(stored).isAuthenticated).toBe(true)
  })

  test('confirming logs out, clears auth and returns to welcome', async () => {
    const { user } = renderWithApp(<Profile />, {
      ...PROFILE,
      state: seededState(),
    })
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Log out',
      }),
    )
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
    expect(JSON.parse(localStorage.getItem(AUTH_KEY)!).isAuthenticated).toBe(
      false,
    )
  })
})

describe('Policies', () => {
  test('links to each policy, active first', () => {
    renderWithApp(<Policies />, { ...POLICIES, state: seededState() })
    const links = screen.getAllByRole('link')
    const rows = links.filter((l) =>
      l.getAttribute('href')?.startsWith('/policy/'),
    )
    expect(rows.map((l) => l.getAttribute('href'))).toEqual([
      '/policy/policy-maize',
      '/policy/policy-beans',
    ])
    expect(screen.getByRole('link', { name: /Lower Shamba/ })).toHaveAttribute(
      'href',
      '/policy/policy-maize',
    )
    expect(screen.getByRole('link', { name: /Machakos Plot/ })).toHaveAttribute(
      'href',
      '/policy/policy-beans',
    )
  })

  test('orders active policies first, then newest start date', () => {
    const base = seededState()
    const maize = base.policies.find((p) => p.id === 'policy-maize')!
    const state = {
      ...base,
      policies: [
        ...base.policies,
        {
          ...maize,
          id: 'old-active',
          coverageStart: '2026-01-01T00:00:00.000Z',
        },
        {
          ...maize,
          id: 'new-expired',
          coverageStart: '2026-11-01T00:00:00.000Z',
          status: 'expired' as const,
        },
      ],
    }
    renderWithApp(<Policies />, { ...POLICIES, state })
    const hrefs = screen
      .getAllByRole('link')
      .map((l) => l.getAttribute('href'))
      .filter((h) => h?.startsWith('/policy/'))
    expect(hrefs).toEqual([
      '/policy/policy-maize',
      '/policy/old-active',
      '/policy/new-expired',
      '/policy/policy-beans',
    ])
  })

  test('shows a status chip, plan, cover and coverage for each policy', () => {
    renderWithApp(<Policies />, { ...POLICIES, state: seededState() })
    const maize = screen.getByRole('link', { name: /Lower Shamba/ })
    expect(within(maize).getByText('Active')).toHaveAttribute(
      'data-status',
      'good',
    )
    expect(within(maize).getByText('Standard')).toBeInTheDocument()
    expect(within(maize).getByText(/^Cover KES\s/)).toBeInTheDocument()
    expect(within(maize).getByText('69 days left')).toBeInTheDocument()
    const beans = screen.getByRole('link', { name: /Machakos Plot/ })
    expect(within(beans).getByText('Paid out')).toHaveAttribute(
      'data-status',
      'warning',
    )
    expect(within(beans).getByText('Ended 31 Jul 2026')).toBeInTheDocument()
  })

  test('amounts use a non-breaking space', () => {
    renderWithApp(<Policies />, { ...POLICIES, state: seededState() })
    expect(
      screen.getAllByText(/^Cover KES [\d,]+$/, RAW).length,
    ).toBeGreaterThan(0)
  })

  test('an expired policy shows as expired', () => {
    renderWithApp(<Policies />, { ...POLICIES, state: accountState(KIPKOECH) })
    const row = screen.getByRole('link', { name: /Expired/ })
    expect(within(row).getByText('Expired')).toHaveAttribute(
      'data-status',
      'neutral',
    )
    expect(within(row).getByText('Ended 31 Jul 2025')).toBeInTheDocument()
  })

  test('a policy whose farm is gone is a plain row with no link or chevron', () => {
    renderWithApp(<Policies />, {
      ...POLICIES,
      state: { ...seededState(), farms: [] },
    })
    expect(screen.getAllByText('Your farm')).toHaveLength(2)
    const rows = screen.getAllByTestId('policy-row-static')
    expect(rows).toHaveLength(2)
    expect(screen.queryAllByRole('link', { name: /Your farm/ })).toHaveLength(0)
    expect(
      screen.queryByRole('link', { name: /policy/i }),
    ).not.toBeInTheDocument()
    for (const row of rows) expect(row.querySelector('svg')).toBeNull()
  })

  test('an active policy whose cover has ended shows as expired and sorts last', () => {
    const base = seededState()
    const maize = base.policies.find((p) => p.id === 'policy-maize')!
    const stale = {
      ...maize,
      id: 'stale-active',
      status: 'active' as const,
      coverageStart: '2026-10-05T00:00:00.000Z',
      coverageEnd: '2026-10-22T00:00:00.000Z',
    }
    renderWithApp(<Policies />, {
      ...POLICIES,
      state: { ...base, policies: [stale, ...base.policies] },
    })
    const rows = screen
      .getAllByRole('link')
      .filter((l) => l.getAttribute('href')?.startsWith('/policy/'))
    expect(rows[0]).toHaveAttribute('href', '/policy/policy-maize')
    const row = screen.getByRole('link', { name: /Ended 22 Oct 2026/ })
    expect(within(row).getByText('Expired')).toHaveAttribute(
      'data-status',
      'neutral',
    )
    expect(within(row).queryByText('Active')).not.toBeInTheDocument()
  })

  test('row name is ellipsised and amounts never wrap', () => {
    renderWithApp(<Policies />, { ...POLICIES, state: seededState() })
    const row = screen.getByRole('link', { name: /Lower Shamba/ })
    expect(within(row).getByText('Lower Shamba').className).toMatch(
      /policyName/,
    )
    expect(within(row).getByText(/^Cover KES/).className).toMatch(/nowrap/)
  })

  test('empty state offers to insure a farm', async () => {
    const { user } = renderWithApp(<Policies />, {
      ...POLICIES,
      state: { ...seededState(), policies: [] },
    })
    expect(screen.getByText('No policies yet')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Insure a farm' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/home')
  })

  test('empty state with no farms offers to add one', async () => {
    const { user } = renderWithApp(<Policies />, {
      ...POLICIES,
      state: { ...seededState(), policies: [], farms: [] },
    })
    await user.click(screen.getByRole('button', { name: 'Add a farm' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/add-farm')
  })
})

describe('PolicyDetail', () => {
  test('shows the certificate facts and linked payouts', () => {
    renderWithApp(<PolicyDetail />, {
      ...detail('policy-beans'),
      state: seededState(),
    })
    expect(screen.getByText('AGR-2026-001982')).toBeInTheDocument()
    expect(screen.getByText('Machakos Plot')).toBeInTheDocument()
    expect(screen.getByText('SC81LM3XQA')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /KES\s10,800/ })).toHaveAttribute(
      'href',
      '/payout-details/payout-beans',
    )
    expect(screen.getByRole('link', { name: 'Open farm' })).toHaveAttribute(
      'href',
      '/farm/farm-beans',
    )
  })

  test('money never wraps mid-amount', () => {
    renderWithApp(<PolicyDetail />, {
      ...detail('policy-beans'),
      state: seededState(),
    })
    expect(screen.getByText('KES 10,800', RAW)).toBeInTheDocument()
    expect(screen.getAllByText(/^KES [\d,]+$/, RAW).length).toBeGreaterThan(2)
  })

  test('shows the stored coverage dates and progress', () => {
    renderWithApp(<PolicyDetail />, {
      ...detail('policy-maize'),
      state: seededState(),
    })
    expect(screen.getByText('1 Oct 2026')).toBeInTheDocument()
    expect(screen.getByText('31 Dec 2026')).toBeInTheDocument()
    expect(screen.getByText('69 days left')).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: 'Cover period' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Payouts on this policy')).not.toBeInTheDocument()
  })

  test('a payout-sent policy from another account', () => {
    renderWithApp(<PolicyDetail />, {
      ...detail('policy-ach-maize'),
      state: accountState(ACHIENG),
    })
    expect(screen.getByText('Payouts on this policy')).toBeInTheDocument()
    expect(screen.getByText('Paid out')).toBeInTheDocument()
  })

  test('an ended active policy shows an Expired chip', () => {
    const base = seededState()
    const policies = base.policies.map((p) =>
      p.id === 'policy-maize'
        ? { ...p, coverageEnd: '2026-10-22T00:00:00.000Z' }
        : p,
    )
    renderWithApp(<PolicyDetail />, {
      ...detail('policy-maize'),
      state: { ...base, policies },
    })
    expect(screen.getByText('Expired')).toHaveAttribute(
      'data-status',
      'neutral',
    )
    expect(screen.queryByText('Active')).not.toBeInTheDocument()
  })

  test('unknown policy shows Not Found', () => {
    renderWithApp(<PolicyDetail />, {
      ...detail('nope'),
      state: seededState(),
    })
    expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
  })

  test('a policy whose farm no longer exists shows Not Found', () => {
    renderWithApp(<PolicyDetail />, {
      ...detail('policy-maize'),
      state: { ...seededState(), farms: [] },
    })
    expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
  })

  test('a policy id from another account shows Not Found', () => {
    renderWithApp(<PolicyDetail />, {
      ...detail('policy-maize'),
      state: accountState(KIPKOECH),
    })
    expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
  })
})

describe('profile styles', () => {
  const css = readFileSync('src/components/cards/cards.module.css', 'utf8')
  const common = readFileSync('src/components/common/common.module.css', 'utf8')
  const added = css.slice(css.indexOf('.coverTrack'))

  test('new rules use tokens, not hex colours, and never animate', () => {
    expect(added).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(added).not.toMatch(/transition|animation/)
  })

  test('the sheet is capped with a dvh height after a vh fallback', () => {
    expect(common).toMatch(/max-height:\s*85vh;\s*max-height:\s*85dvh;/)
  })

  test('body text is at least 16px and rows are tap-sized', () => {
    expect(added).not.toMatch(/font-size:\s*var\(--fs-(xs|sm)\)/)
    expect(added).toMatch(/min-height:\s*var\(--tap\)/)
  })
})
