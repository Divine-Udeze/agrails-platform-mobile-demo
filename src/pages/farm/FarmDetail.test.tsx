import { screen } from '@testing-library/react'
import FarmDetail from '@/src/pages/farm/FarmDetail'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

const at = (id: string) => ({
  route: `/farm/${id}`,
  path: '/farm/:farmId',
  state: seededState(),
})

test('shows an insured farm with its policy', () => {
  renderWithApp(<FarmDetail />, at('farm-maize'))
  expect(
    screen.getByRole('heading', { name: 'Lower Shamba' }),
  ).toBeInTheDocument()
  expect(screen.getByText('Standard')).toBeInTheDocument()
  expect(screen.getByText('Cover KES 100,800')).toBeInTheDocument()
  expect(screen.getByText('Active')).toBeInTheDocument()
})

test('View policy is a full-size tap target', () => {
  renderWithApp(<FarmDetail />, at('farm-maize'))
  const link = screen.getByRole('link', { name: 'View policy' })
  expect(link).toHaveAttribute('href', '/policy/policy-maize')
  // healthLink gives the link a 48px minimum height
  expect(link.className).toMatch(/healthLink/)
})

test('hero tile is named after the crop and farm', () => {
  renderWithApp(<FarmDetail />, at('farm-maize'))
  expect(
    screen.getByRole('img', { name: 'Maize growing on Lower Shamba' }),
  ).toBeInTheDocument()
})

test('offers insurance for an uninsured farm', async () => {
  const { user } = renderWithApp(<FarmDetail />, at('farm-tea'))
  expect(screen.getByText('Protect this farm')).toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: 'See insurance options' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/insure/farm-tea')
})

test('links to health, boundary and yield', () => {
  renderWithApp(<FarmDetail />, at('farm-beans'))
  expect(
    screen.getByRole('link', { name: /see farm health/i }),
  ).toHaveAttribute('href', '/monitor/farm-beans')
  expect(screen.getByRole('link', { name: /view boundary/i })).toHaveAttribute(
    'href',
    '/view-boundary/farm-beans',
  )
  expect(screen.getByRole('link', { name: /past harvests/i })).toHaveAttribute(
    'href',
    '/yield-analysis/farm-beans',
  )
})

test('unknown farm shows Not Found', () => {
  renderWithApp(<FarmDetail />, at('nope'))
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})
