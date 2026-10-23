import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { useLocation, useNavigate } from 'react-router-dom'
import { STATE_KEY } from '@/src/context/persistence'
import Confirmation from '@/src/pages/insurance/Confirmation'
import Payment from '@/src/pages/insurance/Payment'
import * as paymentService from '@/src/services/paymentService'
import * as policyService from '@/src/services/policyService'
import { useApp } from '@/src/context/AppContext'
import { KeyedByFarm } from '@/src/routes/KeyedByFarm'
import {
  markPaymentRecorded,
  startPayment,
} from '@/src/services/paymentRegistry'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'
import type { Policy } from '@/src/types'
import type { PaymentResult } from '@/src/services/paymentService'

const payAt = (id = 'farm-tea') => ({
  route: `/payment/${id}?plan=standard`,
  path: '/payment/:farmId',
  state: seededState(),
})

const storedPolicies = () =>
  JSON.parse(localStorage.getItem(STATE_KEY)!).policies as unknown[]

const PAY = 'Pay KES 14,700'

/** Logs every location; the leave button goes to a stand-in page. */
function LocationLog({ log }: { log: string[] }) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  log.push(pathname + search)
  return (
    <>
      <button type='button' onClick={() => navigate('/elsewhere')}>
        leave
      </button>
      <button
        type='button'
        onClick={() => navigate('/payment/farm-tea?plan=premium')}
      >
        to premium
      </button>
      <button
        type='button'
        onClick={() => navigate('/payment/farm-beans?plan=standard')}
      >
        to beans
      </button>
      <button
        type='button'
        onClick={() => navigate('/payment/farm-tea?plan=standard')}
      >
        back to pay
      </button>
    </>
  )
}

/** Records whether the "already insured" screen was ever in the DOM. */
function watchForAlreadyInsured() {
  let seen = false
  const check = () => {
    if (document.body.textContent?.includes('This farm is already insured'))
      seen = true
  }
  const observer = new MutationObserver(check)
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
  })
  return {
    seen: () => {
      check()
      return seen
    },
    stop: () => observer.disconnect(),
  }
}

function pending() {
  let resolve!: (r: PaymentResult) => void
  const promise = new Promise<PaymentResult>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

test('successful payment creates one policy and lands on the confirmation', async () => {
  const log: string[] = []
  const watcher = watchForAlreadyInsured()
  const quotes = vi.spyOn(policyService, 'getQuote')
  const { user } = renderWithApp(<Payment />, {
    ...payAt(),
    extra: <LocationLog log={log} />,
    strict: true,
  })
  expect(
    await screen.findByText('Standard cover for Tea Garden'),
  ).toBeInTheDocument()
  expect(screen.getByLabelText('M-Pesa number')).toHaveValue('712345678')
  const quoteCalls = quotes.mock.calls.length
  await user.click(screen.getByRole('button', { name: PAY }))
  expect(await screen.findByTestId('location')).toHaveTextContent(
    /^\/confirmation\/farm-tea\?policy=policy-/,
  )
  expect(log[log.length - 1]).toMatch(
    /^\/confirmation\/farm-tea\?policy=policy-/,
  )
  expect(watcher.seen()).toBe(false)
  watcher.stop()
  // no refetch of the quote while the farm flips to insured
  expect(quotes.mock.calls.length).toBe(quoteCalls)
  expect(storedPolicies()).toHaveLength(3)
})

test('a double tap in one tick asks M-Pesa once and adds one policy', async () => {
  const pay = vi.spyOn(paymentService, 'requestMpesaPayment')
  renderWithApp(<Payment />, payAt())
  const button = await screen.findByRole('button', { name: PAY })
  act(() => {
    fireEvent.click(button)
    fireEvent.click(button)
  })
  expect(await screen.findByTestId('location')).toHaveTextContent(
    '/confirmation/farm-tea',
  )
  expect(pay).toHaveBeenCalledTimes(1)
  expect(storedPolicies()).toHaveLength(3)
})

test.each([
  ['0712 345-678', '+254712345678'],
  ['712-345-678', '+254712345678'],
  ['+254 712 345 678', '+254712345678'],
  ['254712345678', '+254712345678'],
  ['0112345678', '+254112345678'],
])('number %s is sent as %s', async (typed, sent) => {
  const pay = vi.spyOn(paymentService, 'requestMpesaPayment')
  const { user } = renderWithApp(<Payment />, payAt())
  const input = await screen.findByLabelText('M-Pesa number')
  await user.clear(input)
  await user.type(input, typed)
  await user.click(screen.getByRole('button', { name: PAY }))
  await screen.findByTestId('location')
  expect(pay).toHaveBeenCalledWith(sent, expect.any(Number))
})

test('a declined payment can be retried and then succeeds', async () => {
  const pay = vi.spyOn(paymentService, 'requestMpesaPayment')
  const { user } = renderWithApp(<Payment />, payAt())
  const input = await screen.findByLabelText('M-Pesa number')
  await user.clear(input)
  await user.type(input, '712345670')
  await user.click(screen.getByRole('button', { name: PAY }))
  expect(
    await screen.findByText('Payment did not go through'),
  ).toBeInTheDocument()
  expect(storedPolicies()).toHaveLength(2)
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  const again = screen.getByLabelText('M-Pesa number')
  await user.clear(again)
  await user.type(again, '712345678')
  await user.click(screen.getByRole('button', { name: PAY }))
  expect(await screen.findByTestId('location')).toHaveTextContent(
    '/confirmation/farm-tea',
  )
  expect(pay).toHaveBeenCalledTimes(2)
  expect(storedPolicies()).toHaveLength(3)
})

test('a timed-out payment says so, adds no policy, and can be retried', async () => {
  const { user } = renderWithApp(<Payment />, payAt())
  const input = await screen.findByLabelText('M-Pesa number')
  await user.clear(input)
  await user.type(input, '712345679')
  await user.click(screen.getByRole('button', { name: PAY }))
  expect(
    await screen.findByText('We did not hear back from M-Pesa'),
  ).toBeInTheDocument()
  expect(storedPolicies()).toHaveLength(2)
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(screen.getByRole('button', { name: PAY })).toBeInTheDocument()
})

test('an invalid number is caught before paying', async () => {
  const pay = vi.spyOn(paymentService, 'requestMpesaPayment')
  const { user } = renderWithApp(<Payment />, payAt())
  const input = await screen.findByLabelText('M-Pesa number')
  await user.clear(input)
  await user.type(input, '123')
  await user.click(screen.getByRole('button', { name: PAY }))
  expect(screen.getByRole('alert')).toHaveTextContent('Safaricom or Airtel')
  expect(pay).not.toHaveBeenCalled()
})

test('payment for an unknown farm shows Not Found', () => {
  renderWithApp(<Payment />, payAt('nope'))
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})

test('a deep link to an already insured farm shows the insured message', async () => {
  renderWithApp(<Payment />, payAt('farm-maize'))
  expect(
    await screen.findByText('This farm is already insured'),
  ).toBeInTheDocument()
  expect(screen.queryByLabelText('M-Pesa number')).not.toBeInTheDocument()
})

test('a failed quote shows a retryable error', async () => {
  vi.spyOn(policyService, 'getQuote').mockRejectedValueOnce(new Error('x'))
  const { user } = renderWithApp(<Payment />, payAt())
  expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('button', { name: PAY })).toBeInTheDocument()
})

test('Close while waiting still records a late success', async () => {
  const p = pending()
  const pay = vi
    .spyOn(paymentService, 'requestMpesaPayment')
    .mockReturnValue(p.promise)
  const log: string[] = []
  const { user } = renderWithApp(<Payment />, {
    ...payAt(),
    extra: <LocationLog log={log} />,
  })
  await user.click(await screen.findByRole('button', { name: PAY }))
  expect(screen.getByText('Check your phone')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Close' }))
  expect(log[log.length - 1]).toBe('/farm/farm-tea')
  await act(async () => {
    p.resolve({ status: 'success', receipt: 'SLATE00001' })
  })
  await waitFor(() => expect(storedPolicies()).toHaveLength(3))
  expect(pay).toHaveBeenCalledTimes(1)
  expect(log[log.length - 1]).toBe('/farm/farm-tea')
})

test('Close during policy creation, then back to pay: one charge, one policy', async () => {
  let release!: () => void
  const create = vi.spyOn(policyService, 'createPolicy')
  const pay = vi.spyOn(paymentService, 'requestMpesaPayment')
  const real = policyService.createPolicy
  create.mockImplementationOnce(
    (...args) =>
      new Promise<Policy>((r) => {
        release = () => void real(...args).then(r)
      }),
  )
  const log: string[] = []
  const { user } = renderWithApp(<Payment />, {
    ...payAt(),
    extra: <LocationLog log={log} />,
  })
  await user.click(await screen.findByRole('button', { name: PAY }))
  await waitFor(() => expect(release).toBeDefined())
  await user.click(screen.getByRole('button', { name: 'Close' }))
  await user.click(screen.getByRole('button', { name: 'back to pay' }))
  // the page is attached to the running payment: waiting, and no Pay button
  expect(await screen.findByText('Check your phone')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: PAY })).not.toBeInTheDocument()
  act(() => release())
  await waitFor(() =>
    expect(log[log.length - 1]).toMatch(/^\/confirmation\/farm-tea\?policy=/),
  )
  expect(pay).toHaveBeenCalledTimes(1)
  expect(storedPolicies()).toHaveLength(3)
})

test('leaving mid-wait and coming back re-attaches instead of paying twice', async () => {
  const p = pending()
  const pay = vi
    .spyOn(paymentService, 'requestMpesaPayment')
    .mockReturnValue(p.promise)
  const watcher = watchForAlreadyInsured()
  const log: string[] = []
  const { user } = renderWithApp(<Payment />, {
    ...payAt(),
    extra: <LocationLog log={log} />,
    strict: true,
  })
  await user.click(await screen.findByRole('button', { name: PAY }))
  await user.click(screen.getByRole('button', { name: 'leave' }))
  await user.click(screen.getByRole('button', { name: 'back to pay' }))
  expect(await screen.findByText('Check your phone')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: PAY })).not.toBeInTheDocument()
  await act(async () => {
    p.resolve({ status: 'success', receipt: 'SLATE00003' })
  })
  await waitFor(() =>
    expect(log[log.length - 1]).toMatch(/^\/confirmation\/farm-tea\?policy=/),
  )
  expect(watcher.seen()).toBe(false)
  watcher.stop()
  expect(pay).toHaveBeenCalledTimes(1)
  expect(storedPolicies()).toHaveLength(3)
})

test('returning to a pending payment shows its amount and the remaining time', async () => {
  vi.spyOn(paymentService, 'requestMpesaPayment').mockReturnValue(
    pending().promise,
  )
  renderWithApp(<Payment />, {
    ...payAt(),
    extra: <LocationLog log={[]} />,
  })
  fireEvent.click(await screen.findByRole('button', { name: PAY }))
  vi.useFakeTimers()
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(20_000)
  })
  fireEvent.click(screen.getByRole('button', { name: 'back to pay' }))
  // immediately: before the quote reloads
  expect(screen.getByText(/to pay KES.14,700 to Agrails/)).toBeInTheDocument()
  expect(screen.getByText('Waiting 40s')).toBeInTheDocument()
})

test('the waiting screen shows the charged amount even if the reloaded quote differs', async () => {
  const real = policyService.getQuote
  const getQuote = vi.spyOn(policyService, 'getQuote')
  vi.spyOn(paymentService, 'requestMpesaPayment').mockReturnValue(
    pending().promise,
  )
  const { user } = renderWithApp(<Payment />, {
    ...payAt(),
    extra: <LocationLog log={[]} />,
  })
  await user.click(await screen.findByRole('button', { name: PAY }))
  await user.click(screen.getByRole('button', { name: 'Close' }))
  const before = getQuote.mock.calls.length
  getQuote.mockImplementation(async (...args) => ({
    ...(await real(...args)),
    farmerPremiumKES: 15_000,
  }))
  await user.click(screen.getByRole('button', { name: 'back to pay' }))
  await waitFor(() =>
    expect(getQuote.mock.calls.length).toBeGreaterThan(before),
  )
  await act(async () => {})
  expect(screen.getByText(/to pay KES.14,700 to Agrails/)).toBeInTheDocument()
  expect(screen.queryByText(/15,000/)).not.toBeInTheDocument()
})

test('after a failed payment, the next attempt shows its own amount, not the failed one', async () => {
  const pay = vi
    .spyOn(paymentService, 'requestMpesaPayment')
    .mockResolvedValueOnce({ status: 'failed' })
    .mockReturnValue(pending().promise)
  const { user } = renderWithApp(<Payment />, {
    ...payAt(),
    extra: <LocationLog log={[]} />,
  })
  await user.click(await screen.findByRole('button', { name: PAY }))
  await user.click(await screen.findByRole('button', { name: 'Try again' }))
  await user.click(screen.getByRole('button', { name: 'to premium' }))
  const premium = await screen.findByRole('button', {
    name: /^Pay KES (?!14,700)/,
  })
  await user.click(premium)
  expect(screen.getByText('Check your phone')).toBeInTheDocument()
  expect(screen.queryByText(/to pay KES.14,700/)).not.toBeInTheDocument()
  expect(pay).toHaveBeenCalledTimes(2)
  expect(pay.mock.calls[1][1]).not.toBe(pay.mock.calls[0][1])
})

test('mounting attached to a payment that then fails: the next plan shows its own amount', async () => {
  const first = pending()
  const pay = vi
    .spyOn(paymentService, 'requestMpesaPayment')
    .mockReturnValueOnce(first.promise)
    .mockReturnValue(pending().promise)
  const { user } = renderWithApp(<Payment />, {
    ...payAt(),
    extra: <LocationLog log={[]} />,
  })
  await user.click(await screen.findByRole('button', { name: PAY }))
  await user.click(screen.getByRole('button', { name: 'leave' }))
  await user.click(screen.getByRole('button', { name: 'back to pay' }))
  expect(await screen.findByText(/to pay KES.14,700/)).toBeInTheDocument()
  await act(async () => {
    first.resolve({ status: 'failed' })
  })
  await user.click(await screen.findByRole('button', { name: 'Try again' }))
  await user.click(screen.getByRole('button', { name: 'to premium' }))
  const premium = await screen.findByRole('button', {
    name: /^Pay KES (?!14,700)/,
  })
  await user.click(premium)
  expect(screen.getByText('Check your phone')).toBeInTheDocument()
  expect(screen.queryByText(/to pay KES.14,700/)).not.toBeInTheDocument()
  expect(pay).toHaveBeenCalledTimes(2)
})

test('a blocked payment with no active policy shows a message and can be retried', async () => {
  const { user } = renderWithApp(<Payment />, payAt())
  const button = await screen.findByRole('button', { name: PAY })
  markPaymentRecorded('farm-tea') // after mount: login resets the registry
  await user.click(button)
  expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  await user.click(await screen.findByRole('button', { name: PAY }))
  expect(await screen.findByTestId('location')).toHaveTextContent(
    '/confirmation/farm-tea',
  )
  expect(storedPolicies()).toHaveLength(3)
})

test('the confirmation page releases the just-paid marker once the policy is committed', async () => {
  let dispatch!: ReturnType<typeof useApp>['dispatch']
  function Grab() {
    dispatch = useApp().dispatch
    return null
  }
  renderWithApp(<Confirmation />, {
    ...confirmAt('/confirmation/farm-tea'),
    extra: <Grab />,
  })
  markPaymentRecorded('farm-tea') // after mount: login resets the registry
  const maize = seededState().policies.find((p) => p.id === 'policy-maize')!
  await act(async () => {
    dispatch({
      type: 'ADD_POLICY',
      policy: { ...maize, id: 'policy-tea', farmId: 'farm-tea' },
    })
  })
  const run = vi.fn(async () => ({ status: 'failed' as const }))
  await startPayment('farm-tea', 1, run)
  expect(run).toHaveBeenCalledTimes(1)
})

test('leaving the issue screen by the header back clears it', async () => {
  vi.spyOn(policyService, 'createPolicy').mockRejectedValueOnce(new Error('x'))
  const { user } = renderWithApp(<Payment />, {
    ...payAt(),
    extra: <LocationLog log={[]} />,
  })
  await user.click(await screen.findByRole('button', { name: PAY }))
  await screen.findByText('Your payment went through, but we hit a problem')
  await user.click(screen.getByRole('button', { name: 'Back' }))
  await user.click(screen.getByRole('button', { name: 'back to pay' }))
  expect(await screen.findByRole('button', { name: PAY })).toBeInTheDocument()
})

test('after a settled payment, startPayment does not run again for the farm', async () => {
  const run = vi.fn(async () => {
    markPaymentRecorded('farm-y')
    return { status: 'failed' as const }
  })
  await startPayment('farm-y', 1, run)
  const again = await startPayment('farm-y', 1, run)
  expect(again).toEqual({ status: 'blocked' })
  expect(run).toHaveBeenCalledTimes(1)
})

test('a payment finishing after another user logged in records nothing for them', async () => {
  const p = pending()
  vi.spyOn(paymentService, 'requestMpesaPayment').mockReturnValue(p.promise)
  let dispatch!: ReturnType<typeof useApp>['dispatch']
  function Grab() {
    dispatch = useApp().dispatch
    return null
  }
  const create = vi.spyOn(policyService, 'createPolicy')
  const { user } = renderWithApp(<Payment />, { ...payAt(), extra: <Grab /> })
  await user.click(await screen.findByRole('button', { name: PAY }))
  act(() => {
    dispatch({ type: 'LOGIN', phone: '+254799000111', isNewUser: true })
  })
  await act(async () => {
    p.resolve({ status: 'success', receipt: 'SLATE00009' })
  })
  await waitFor(() => expect(create).toHaveBeenCalled())
  await act(async () => {})
  expect(storedPolicies()).toHaveLength(0)
})

test('changing farm remounts the payment page with fresh state', async () => {
  vi.spyOn(paymentService, 'requestMpesaPayment').mockReturnValue(
    pending().promise,
  )
  const { user } = renderWithApp(
    <KeyedByFarm>
      <Payment />
    </KeyedByFarm>,
    { ...payAt(), extra: <LocationLog log={[]} /> },
  )
  await user.click(await screen.findByRole('button', { name: PAY }))
  expect(screen.getByText('Check your phone')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'to beans' }))
  expect(screen.queryByText('Check your phone')).not.toBeInTheDocument()
  expect(await screen.findByLabelText('M-Pesa number')).toBeInTheDocument()
})

test('startPayment shares one running payment per farm', async () => {
  const p = pending()
  const run = vi.fn(async () => {
    await p.promise
    return { status: 'failed' as const }
  })
  const first = startPayment('farm-x', 1, run)
  const second = startPayment('farm-x', 1, run)
  expect(second).toBe(first)
  expect(run).toHaveBeenCalledTimes(1)
  p.resolve({ status: 'failed' })
  await first
  startPayment('farm-x', 1, run)
  expect(run).toHaveBeenCalledTimes(2)
})

test('a policy failure after Close is shown when the farmer returns', async () => {
  let fail!: () => void
  vi.spyOn(policyService, 'createPolicy').mockImplementationOnce(
    () =>
      new Promise<Policy>((_, reject) => {
        fail = () => reject(new Error('x'))
      }),
  )
  const log: string[] = []
  const { user } = renderWithApp(<Payment />, {
    ...payAt(),
    extra: <LocationLog log={log} />,
  })
  await user.click(await screen.findByRole('button', { name: PAY }))
  await waitFor(() => expect(fail).toBeDefined())
  await user.click(screen.getByRole('button', { name: 'Close' }))
  await act(async () => {
    fail()
  })
  await user.click(screen.getByRole('button', { name: 'back to pay' }))
  expect(
    await screen.findByText('Your payment went through, but we hit a problem'),
  ).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: PAY })).not.toBeInTheDocument()
  expect(storedPolicies()).toHaveLength(2)
})

test('no charge is sent if the farm became insured just before the request', async () => {
  const pay = vi.spyOn(paymentService, 'requestMpesaPayment')
  let dispatch!: ReturnType<typeof useApp>['dispatch']
  function Grab() {
    dispatch = useApp().dispatch
    return null
  }
  renderWithApp(<Payment />, { ...payAt(), extra: <Grab /> })
  const button = await screen.findByRole('button', { name: PAY })
  const maize = seededState().policies.find((p) => p.id === 'policy-maize')!
  await act(async () => {
    dispatch({
      type: 'ADD_POLICY',
      policy: { ...maize, id: 'policy-other', farmId: 'farm-tea' },
    })
    fireEvent.click(button)
  })
  expect(pay).not.toHaveBeenCalled()
  expect(storedPolicies()).toHaveLength(3)
})

test('leaving mid-wait still records the policy on success, without navigating', async () => {
  const p = pending()
  vi.spyOn(paymentService, 'requestMpesaPayment').mockReturnValue(p.promise)
  const log: string[] = []
  const { user } = renderWithApp(<Payment />, {
    ...payAt(),
    extra: <LocationLog log={log} />,
    strict: true,
  })
  await user.click(await screen.findByRole('button', { name: PAY }))
  await user.click(screen.getByRole('button', { name: 'leave' }))
  expect(log[log.length - 1]).toBe('/elsewhere')
  await act(async () => {
    p.resolve({ status: 'success', receipt: 'SLATE00002' })
  })
  await waitFor(() => expect(storedPolicies()).toHaveLength(3))
  expect(log[log.length - 1]).toBe('/elsewhere')
  expect(log.some((l) => l.startsWith('/confirmation'))).toBe(false)
})

test('leaving mid-wait then a decline does nothing', async () => {
  const p = pending()
  vi.spyOn(paymentService, 'requestMpesaPayment').mockReturnValue(p.promise)
  const error = vi.spyOn(console, 'error')
  const { user } = renderWithApp(<Payment />, {
    ...payAt(),
    extra: <LocationLog log={[]} />,
  })
  await user.click(await screen.findByRole('button', { name: PAY }))
  await user.click(screen.getByRole('button', { name: 'leave' }))
  await act(async () => {
    p.resolve({ status: 'failed' })
  })
  expect(storedPolicies()).toHaveLength(2)
  expect(error).not.toHaveBeenCalled()
})

test('the countdown stops at 0 and never goes negative', async () => {
  vi.spyOn(paymentService, 'requestMpesaPayment').mockReturnValue(
    pending().promise,
  )
  renderWithApp(<Payment />, payAt())
  const button = await screen.findByRole('button', { name: PAY })
  vi.useFakeTimers()
  fireEvent.click(button)
  expect(screen.getByText('Waiting 60s')).toBeInTheDocument()
  // each tick re-renders and schedules the next, so step one second at a time
  const tick = async (n: number) => {
    for (let i = 0; i < n; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
    }
  }
  await tick(5)
  expect(screen.getByText('Waiting 55s')).toBeInTheDocument()
  await tick(70)
  expect(screen.queryByText('Waiting 0s')).not.toBeInTheDocument()
  expect(screen.getByText('Still waiting for M-Pesa…')).toBeInTheDocument()
})

test('if the policy cannot be created after payment, the farmer is told and the page recovers', async () => {
  vi.spyOn(policyService, 'createPolicy').mockRejectedValueOnce(new Error('x'))
  const log: string[] = []
  const { user } = renderWithApp(<Payment />, {
    ...payAt(),
    extra: <LocationLog log={log} />,
  })
  await user.click(await screen.findByRole('button', { name: PAY }))
  expect(
    await screen.findByText('Your payment went through, but we hit a problem'),
  ).toBeInTheDocument()
  expect(screen.queryByText('Check your phone')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Go to my farm' })).toBeVisible()
  expect(log.some((l) => l.startsWith('/confirmation'))).toBe(false)
  expect(storedPolicies()).toHaveLength(2)
})

test('if M-Pesa itself errors, the farmer can try again', async () => {
  const pay = vi
    .spyOn(paymentService, 'requestMpesaPayment')
    .mockRejectedValueOnce(new Error('network'))
  const { user } = renderWithApp(<Payment />, payAt())
  await user.click(await screen.findByRole('button', { name: PAY }))
  expect(
    await screen.findByText('Payment did not go through'),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  pay.mockRestore()
  await user.click(screen.getByRole('button', { name: PAY }))
  expect(await screen.findByTestId('location')).toHaveTextContent(
    '/confirmation/farm-tea',
  )
  expect(storedPolicies()).toHaveLength(3)
})

const confirmAt = (route: string) => ({
  route,
  path: '/confirmation/:farmId',
  state: seededState(),
})

test('confirmation shows the certificate and links to the farm', async () => {
  const { user } = renderWithApp(
    <Confirmation />,
    confirmAt('/confirmation/farm-maize?policy=policy-maize'),
  )
  expect(screen.getByText('You are covered!')).toBeInTheDocument()
  expect(screen.getByText('AGR-2026-004417')).toBeInTheDocument()
  expect(screen.getByText('SJK4H7Q2TZ')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Go to my farm' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/farm/farm-maize')
})

test('confirmation falls back to the farm active policy without ?policy', () => {
  renderWithApp(<Confirmation />, confirmAt('/confirmation/farm-maize'))
  expect(screen.getByText('AGR-2026-004417')).toBeInTheDocument()
})

test('confirmation falls back to the active policy for an unknown policy id', () => {
  renderWithApp(
    <Confirmation />,
    confirmAt('/confirmation/farm-maize?policy=policy-nope'),
  )
  expect(screen.getByText('AGR-2026-004417')).toBeInTheDocument()
})

test('confirmation shows the requested policy even when it is not active', () => {
  renderWithApp(
    <Confirmation />,
    confirmAt('/confirmation/farm-beans?policy=policy-beans'),
  )
  expect(screen.getByText('AGR-2026-001982')).toBeInTheDocument()
  expect(screen.getByText('Policy certificate')).toBeInTheDocument()
  expect(screen.queryByText('You are covered!')).not.toBeInTheDocument()
})

test('confirmation without any policy shows Not Found', () => {
  renderWithApp(<Confirmation />, confirmAt('/confirmation/farm-tea'))
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})

test('confirmation with an unknown policy and no active policy shows Not Found', () => {
  renderWithApp(
    <Confirmation />,
    confirmAt('/confirmation/farm-tea?policy=policy-nope'),
  )
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})

test('confirmation for an unknown farm shows Not Found', () => {
  renderWithApp(
    <Confirmation />,
    confirmAt('/confirmation/nope?policy=policy-maize'),
  )
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})
