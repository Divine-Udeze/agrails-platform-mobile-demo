import { screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import { initialState } from '@/src/context/reducer'
import { STATE_KEY } from '@/src/context/persistence'
import OtpVerification from '@/src/pages/onboarding/OtpVerification'
import PhoneEntry from '@/src/pages/onboarding/PhoneEntry'
import Registration from '@/src/pages/onboarding/Registration'
import Welcome from '@/src/pages/onboarding/Welcome'
import * as authService from '@/src/services/authService'
import { renderWithApp } from '@/src/test/renderWithApp'

// The real service, wrapped so tests can count calls.
vi.mock('@/src/services/authService', async (importOriginal) => {
  const actual = await importOriginal<typeof authService>()
  return { ...actual, verifyOtp: vi.fn(actual.verifyOtp) }
})

afterEach(() => {
  vi.mocked(authService.verifyOtp).mockClear()
})

test('Welcome shows the value story and starts sign-up', async () => {
  const { user } = renderWithApp(<Welcome />)
  expect(screen.getByText('Protect your harvest')).toBeInTheDocument()
  expect(screen.getByText('We watch your farm from space')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Get started' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/phone-entry')
})

test('Welcome jumps between slides when the phone asks for less motion', async () => {
  const original = window.matchMedia
  window.matchMedia = ((query: string) => ({
    ...original(query),
    matches: query === '(prefers-reduced-motion: reduce)',
  })) as typeof window.matchMedia
  const scrollTo = vi.fn()
  const savedScrollTo = Element.prototype.scrollTo
  Element.prototype.scrollTo = scrollTo
  try {
    const { user } = renderWithApp(<Welcome />)
    await user.click(screen.getByRole('button', { name: 'Slide 2 of 3' }))
    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'auto' }),
    )
  } finally {
    window.matchMedia = original
    Element.prototype.scrollTo = savedScrollTo
  }
})

test('Welcome glides between slides by default', async () => {
  const scrollTo = vi.fn()
  const savedScrollTo = Element.prototype.scrollTo
  Element.prototype.scrollTo = scrollTo
  try {
    const { user } = renderWithApp(<Welcome />)
    await user.click(screen.getByRole('button', { name: 'Slide 2 of 3' }))
    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    )
  } finally {
    Element.prototype.scrollTo = savedScrollTo
  }
})

test('Welcome sends existing policyholders to policy lookup', async () => {
  const { user } = renderWithApp(<Welcome />)
  await user.click(
    screen.getByRole('button', { name: 'I already have a policy' }),
  )
  expect(screen.getByTestId('location')).toHaveTextContent('/policy-lookup')
})

test('PhoneEntry rejects a bad number', async () => {
  const { user } = renderWithApp(<PhoneEntry />, {
    route: '/phone-entry',
    path: '/phone-entry',
  })
  await user.type(screen.getByLabelText('Phone number'), '812')
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Safaricom or Airtel')
})

test('PhoneEntry accepts a number with a leading 0 and spaces', async () => {
  const { user } = renderWithApp(<PhoneEntry />, {
    route: '/phone-entry',
    path: '/phone-entry',
  })
  await user.type(screen.getByLabelText('Phone number'), '0712 345 678')
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  expect(await screen.findByTestId('location')).toHaveTextContent(
    '/otp-verification',
  )
})

const otpRoute = (phone: string) => ({
  route: { pathname: '/otp-verification', state: { phone, hint: '123456' } },
  path: '/otp-verification',
})

test('OTP without a phone goes back to phone entry', () => {
  renderWithApp(<OtpVerification />, {
    route: '/otp-verification',
    path: '/otp-verification',
  })
  expect(screen.getByTestId('location')).toHaveTextContent('/phone-entry')
})

test('OTP shows the demo code and rejects a wrong code', async () => {
  const { user } = renderWithApp(<OtpVerification />, otpRoute('+254712345678'))
  expect(screen.getByText('Demo code: 123456')).toBeInTheDocument()
  expect(screen.getByText(/\+254 712 345 678/)).toBeInTheDocument()
  await user.click(screen.getByLabelText('Digit 1'))
  await user.keyboard('000000')
  expect(await screen.findByRole('alert')).toHaveTextContent('not right')
  expect(screen.getByLabelText('Digit 1')).toHaveValue('')
  expect(screen.getByLabelText('Digit 1')).toHaveFocus()
})

test('OTP for the seeded farmer goes home', async () => {
  const { user } = renderWithApp(<OtpVerification />, otpRoute('+254712345678'))
  await user.click(screen.getByLabelText('Digit 1'))
  await user.keyboard('123456')
  expect(await screen.findByTestId('location')).toHaveTextContent('/home')
})

test('OTP for a new number goes to registration', async () => {
  const { user } = renderWithApp(<OtpVerification />, otpRoute('+254700000001'))
  await user.click(screen.getByLabelText('Digit 1'))
  await user.keyboard('123456')
  expect(await screen.findByTestId('location')).toHaveTextContent(
    '/registration',
  )
})

test('OTP checks a code once and logs in once under StrictMode', async () => {
  const { user } = renderWithApp(<OtpVerification />, {
    ...otpRoute('+254712345678'),
    strict: true,
  })
  await user.click(screen.getByLabelText('Digit 1'))
  await user.keyboard('123456')
  expect(await screen.findByTestId('location')).toHaveTextContent('/home')
  expect(authService.verifyOtp).toHaveBeenCalledTimes(1)
})

test('OTP lets the farmer retry the same wrong code', async () => {
  const { user } = renderWithApp(<OtpVerification />, {
    ...otpRoute('+254712345678'),
    strict: true,
  })
  await user.click(screen.getByLabelText('Digit 1'))
  await user.keyboard('000000')
  expect(await screen.findByRole('alert')).toHaveTextContent('not right')
  await user.keyboard('000000')
  await vi.waitFor(() => expect(authService.verifyOtp).toHaveBeenCalledTimes(2))
})

test('OTP after a policy lookup shows the masked phone and loads that farmer', async () => {
  const { user } = renderWithApp(<OtpVerification />, {
    route: {
      pathname: '/otp-verification',
      state: { phone: '+254722111222', hint: '123456', masked: true },
    },
    path: '/otp-verification',
  })
  expect(screen.getByText(/\+254 7•• ••• 222/)).toBeInTheDocument()
  expect(screen.queryByText(/722 111 222/)).not.toBeInTheDocument()
  await user.click(screen.getByLabelText('Digit 1'))
  await user.keyboard('123456')
  expect(await screen.findByTestId('location')).toHaveTextContent('/home')
  expect(localStorage.getItem(STATE_KEY)).toContain('Kipkoech Langat')
})

test('OTP after a policy lookup sends "Change number" back to policy lookup', async () => {
  const { user } = renderWithApp(<OtpVerification />, {
    route: {
      pathname: '/otp-verification',
      state: { phone: '+254722111222', hint: '123456', masked: true },
    },
    path: '/otp-verification',
  })
  await user.click(screen.getByRole('button', { name: 'Change number' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/policy-lookup')
})

test('OTP resend is locked during the countdown', () => {
  renderWithApp(<OtpVerification />, otpRoute('+254700000001'))
  expect(
    screen.getByRole('button', { name: /resend code in 30s/i }),
  ).toBeDisabled()
})

const newUser = {
  ...initialState,
  auth: { isAuthenticated: true, phone: '+254700000001', isNewUser: true },
}

test('Registration validates every field', async () => {
  const { user } = renderWithApp(<Registration />, {
    route: '/registration',
    path: '/registration',
    state: newUser,
  })
  await user.click(screen.getByRole('button', { name: 'Create my account' }))
  const alerts = screen.getAllByRole('alert').map((a) => a.textContent)
  expect(alerts).toEqual([
    'Enter your full name',
    'Choose your county',
    'Your ID number has 7 or 8 digits',
    'Choose your main crop',
  ])
})

test('Registration stops an ID that already has a policy', async () => {
  const { user } = renderWithApp(<Registration />, {
    route: '/registration',
    path: '/registration',
    state: newUser,
  })
  await user.type(screen.getByLabelText('Full name'), 'Someone Else')
  await user.click(screen.getByRole('button', { name: /county/i }))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Kericho' }),
  )
  await user.type(screen.getByLabelText('National ID number'), '31234567')
  await user.click(screen.getByRole('radio', { name: /tea/i }))
  await user.click(screen.getByRole('button', { name: 'Create my account' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'This ID already has a policy with us.',
  )
  await user.click(screen.getByRole('button', { name: 'Find my policy' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/policy-lookup')
})

test('Registration creates the farmer and goes home', async () => {
  const { user } = renderWithApp(<Registration />, {
    route: '/registration',
    path: '/registration',
    state: newUser,
  })
  await user.type(screen.getByLabelText('Full name'), 'Otieno Ouma')
  await user.click(screen.getByRole('button', { name: /county/i }))
  const sheet = screen.getByRole('dialog')
  await user.type(within(sheet).getByLabelText('Search counties'), 'kisu')
  await user.click(within(sheet).getByRole('button', { name: 'Kisumu' }))
  await user.type(screen.getByLabelText('National ID number'), '1234567')
  await user.click(screen.getByRole('radio', { name: /maize/i }))
  await user.click(screen.getByRole('button', { name: 'Create my account' }))
  expect(await screen.findByTestId('location')).toHaveTextContent('/home')
  expect(localStorage.getItem(STATE_KEY)).toContain('Otieno Ouma')
})
