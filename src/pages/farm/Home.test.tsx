import { screen } from '@testing-library/react'
import Home from '@/src/pages/farm/Home'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

test('greets the farmer and shows weather', () => {
  renderWithApp(<Home />, {
    route: '/home',
    path: '/home',
    state: seededState(),
  })
  expect(screen.getByText('Hello, Wanjiru')).toBeInTheDocument()
  expect(screen.getByText(/chance of rain/)).toBeInTheDocument()
})

test('shows the unread payout banner', async () => {
  const { user } = renderWithApp(<Home />, {
    route: '/home',
    path: '/home',
    state: seededState(),
  })
  expect(
    screen.getByText('You have a payout of KES 10,800'),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: /see payout/i }))
  expect(screen.getByTestId('location')).toHaveTextContent(
    '/payout/payout-beans',
  )
})

test('alerts about the stressed beans farm', () => {
  renderWithApp(<Home />, {
    route: '/home',
    path: '/home',
    state: seededState(),
  })
  expect(
    screen.getByText('Your Beans in Machakos needs attention'),
  ).toBeInTheDocument()
})

test('summarises protection and offers to insure the tea farm', () => {
  renderWithApp(<Home />, {
    route: '/home',
    path: '/home',
    state: seededState(),
  })
  expect(screen.getByText('1.2 ha of 4 ha insured')).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: 'Insure Tea Garden' }),
  ).toHaveAttribute('href', '/insure/farm-tea')
})

test('lists farm cards that open the farm', async () => {
  const { user } = renderWithApp(<Home />, {
    route: '/home',
    path: '/home',
    state: seededState(),
  })
  const cards = screen.getAllByRole('link', {
    name: /^(Lower Shamba|Machakos Plot|Tea Garden)/,
  })
  expect(cards).toHaveLength(3)
  await user.click(cards[0])
  expect(screen.getByTestId('location')).toHaveTextContent('/farm/farm-maize')
})

test('new farmer sees an empty state with Add farm', async () => {
  const s = seededState()
  const { user } = renderWithApp(<Home />, {
    route: '/home',
    path: '/home',
    state: { ...s, farms: [], policies: [], payouts: [] },
  })
  expect(screen.getByText('No farms yet')).toBeInTheDocument()
  await user.click(screen.getAllByRole('button', { name: 'Add farm' })[0])
  expect(screen.getByTestId('location')).toHaveTextContent('/add-farm')
})
