import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { BottomNav } from '@/src/components/common/BottomNav'
import { BottomSheet } from '@/src/components/common/BottomSheet'
import { Button } from '@/src/components/common/Button'
import { CropTile } from '@/src/components/common/CropTile'
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

test('Header renders a heading only when it has a title', () => {
  const { unmount } = renderWithApp(<Header back='/home' />)
  expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  unmount()
  renderWithApp(<Header title='Farm' back='/home' />)
  expect(screen.getByRole('heading', { level: 1, name: 'Farm' })).toBeVisible()
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

test('BottomSheet closes on Escape and restores focus to the opener', async () => {
  const user = userEvent.setup()
  function Host() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button type='button' onClick={() => setOpen(true)}>
          Open it
        </button>
        <BottomSheet open={open} onClose={() => setOpen(false)} title='Farm'>
          body
        </BottomSheet>
      </>
    )
  }
  render(<Host />)
  const opener = screen.getByRole('button', { name: 'Open it' })
  await user.click(opener)
  expect(screen.getByRole('dialog', { name: 'Farm' })).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(opener).toHaveFocus()
})

test('BottomSheet leaves focus alone when a child already took it', () => {
  render(
    <BottomSheet open onClose={vi.fn()} title='Farm'>
      <input aria-label='search' autoFocus />
    </BottomSheet>,
  )
  expect(screen.getByRole('textbox', { name: 'search' })).toHaveFocus()
})

test('CropTile is decorative unless labelled and carries crop and status', () => {
  const { container, rerender } = render(
    <CropTile crop='maize' status='warning' />,
  )
  const tile = container.firstElementChild as HTMLElement
  expect(tile).toHaveAttribute('data-crop', 'maize')
  expect(tile).toHaveAttribute('data-status', 'warning')
  expect(tile).toHaveAttribute('aria-hidden', 'true')
  rerender(<CropTile crop='maize' label='Maize' />)
  expect(screen.getByRole('img', { name: 'Maize' })).toBeInTheDocument()
})

test('CropTile draws distinct art per crop', () => {
  const art = (crop: 'maize' | 'beans' | 'tea') => {
    const { container, unmount } = render(<CropTile crop={crop} />)
    const html = container.querySelector('svg')?.innerHTML ?? ''
    unmount()
    return html
  }
  const [m, b, t] = [art('maize'), art('beans'), art('tea')]
  expect(m.length).toBeGreaterThan(0)
  expect(new Set([m, b, t]).size).toBe(3)
})

test('BottomSheet skips focus restore safely when the opener has unmounted', async () => {
  const user = userEvent.setup()
  function Host() {
    const [open, setOpen] = useState(false)
    const [showOpener, setShowOpener] = useState(true)
    return (
      <>
        {showOpener && (
          <button type='button' onClick={() => setOpen(true)}>
            Open it
          </button>
        )}
        <BottomSheet open={open} onClose={() => setOpen(false)} title='Farm'>
          <button type='button' onClick={() => setShowOpener(false)}>
            Remove opener
          </button>
        </BottomSheet>
      </>
    )
  }
  render(<Host />)
  await user.click(screen.getByRole('button', { name: 'Open it' }))
  await user.click(screen.getByRole('button', { name: 'Remove opener' }))
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Open it' })).toBeNull()
})

test('BottomSheet closes on Escape while typing in a nested input', async () => {
  const onClose = vi.fn()
  const user = userEvent.setup()
  render(
    <BottomSheet open onClose={onClose} title='Farm'>
      <input aria-label='search' />
    </BottomSheet>,
  )
  await user.type(screen.getByRole('textbox', { name: 'search' }), 'na')
  await user.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalledOnce()
})

test('stacked BottomSheets close one at a time, topmost first', async () => {
  const user = userEvent.setup()
  const closeA = vi.fn()
  const closeB = vi.fn()
  render(
    <>
      <BottomSheet open onClose={closeA} title='A'>
        a
      </BottomSheet>
      <BottomSheet open onClose={closeB} title='B'>
        b
      </BottomSheet>
    </>,
  )
  await user.keyboard('{Escape}')
  expect(closeB).toHaveBeenCalledOnce()
  expect(closeA).not.toHaveBeenCalled()
})

test('BottomSheet traps Tab and Shift+Tab inside the sheet', async () => {
  const user = userEvent.setup()
  render(
    <>
      <button type='button'>Outside</button>
      <BottomSheet open onClose={vi.fn()} title='Farm'>
        <button type='button'>One</button>
        <button type='button'>Two</button>
      </BottomSheet>
    </>,
  )
  const close = screen.getByRole('button', { name: 'Close' })
  const two = screen.getByRole('button', { name: 'Two' })
  await user.tab()
  expect(close).toHaveFocus()
  await user.tab()
  await user.tab()
  expect(two).toHaveFocus()
  await user.tab()
  expect(close).toHaveFocus()
  await user.tab({ shift: true })
  expect(two).toHaveFocus()
})

test('the Tab trap skips hidden and invisible controls', async () => {
  const user = userEvent.setup()
  render(
    <BottomSheet open onClose={vi.fn()} title='Farm'>
      <button type='button'>Two</button>
      <button type='button' disabled>
        Disabled
      </button>
      <button type='button' hidden>
        Hidden attr
      </button>
      <button type='button' style={{ display: 'none' }}>
        Display none
      </button>
      <button type='button' style={{ visibility: 'hidden' }}>
        Invisible
      </button>
    </BottomSheet>,
  )
  const close = screen.getByRole('button', { name: 'Close' })
  const two = screen.getByRole('button', { name: 'Two' })
  await user.tab()
  expect(close).toHaveFocus()
  await user.tab()
  expect(two).toHaveFocus()
  await user.tab()
  expect(close).toHaveFocus()
  await user.tab({ shift: true })
  expect(two).toHaveFocus()
})

test('the Tab trap skips a control inside a display:none wrapper', async () => {
  const user = userEvent.setup()
  render(
    <BottomSheet open onClose={vi.fn()} title='Farm'>
      <button type='button'>Two</button>
      <div style={{ display: 'none' }}>
        <button type='button'>Buried</button>
      </div>
    </BottomSheet>,
  )
  const close = screen.getByRole('button', { name: 'Close' })
  await user.tab()
  await user.tab()
  expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus()
  await user.tab()
  expect(close).toHaveFocus()
})
