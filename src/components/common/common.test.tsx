import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottomNav } from '@/src/components/common/BottomNav'
import { BottomSheet } from '@/src/components/common/BottomSheet'
import { Button } from '@/src/components/common/Button'
import { Chip } from '@/src/components/common/Chip'
import { ErrorState } from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { Icon } from '@/src/components/common/Icons'
import { ProgressTimeline } from '@/src/components/common/ProgressTimeline'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

test('Icon is decorative unless titled', () => {
  const { container, rerender } = render(<Icon name='home' />)
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  rerender(<Icon name='home' title='Home' />)
  expect(screen.getByRole('img', { name: 'Home' })).toBeInTheDocument()
})

test('Button loading is disabled and busy', () => {
  render(<Button loading>Pay</Button>)
  const btn = screen.getByRole('button', { name: /pay/i })
  expect(btn).toBeDisabled()
  expect(btn).toHaveAttribute('aria-busy', 'true')
})

test('Header back button navigates to the given path', async () => {
  const { user } = renderWithApp(<Header title='Farm' back='/home' />, {
    route: '/farm/1',
    path: '/farm/:id',
  })
  await user.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/home')
})

test('BottomNav shows five tabs and an unread payout dot', () => {
  renderWithApp(<BottomNav />, { state: seededState() })
  for (const name of ['Home', 'Monitor', 'Map', 'Payouts', 'Profile']) {
    expect(
      screen.getByRole('link', { name: new RegExp(name) }),
    ).toBeInTheDocument()
  }
  expect(screen.getByLabelText('New payout')).toBeInTheDocument()
})

test('Chip exposes its status', () => {
  render(<Chip status='danger'>Alert</Chip>)
  expect(screen.getByText('Alert').closest('[data-status]')).toHaveAttribute(
    'data-status',
    'danger',
  )
})

test('ErrorState shows default copy and retries', async () => {
  const onRetry = vi.fn()
  render(<ErrorState kind='offline' onRetry={onRetry} />)
  expect(screen.getByText("You're offline")).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(onRetry).toHaveBeenCalledOnce()
})

test('ProgressTimeline marks done, current and pending steps', () => {
  render(
    <ProgressTimeline
      currentIndex={1}
      steps={[
        { key: 'a', label: 'Triggered', date: '2 Sep' },
        { key: 'b', label: 'Assessed' },
        { key: 'c', label: 'Paid' },
      ]}
    />,
  )
  const items = screen.getAllByRole('listitem')
  expect(items.map((li) => li.getAttribute('data-state'))).toEqual([
    'done',
    'current',
    'pending',
  ])
})

test('BottomSheet renders only when open and closes', async () => {
  const onClose = vi.fn()
  const { rerender } = render(
    <BottomSheet open={false} onClose={onClose} title='Farm'>
      body
    </BottomSheet>,
  )
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  rerender(
    <BottomSheet open onClose={onClose} title='Farm'>
      body
    </BottomSheet>,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(onClose).toHaveBeenCalledOnce()
})
