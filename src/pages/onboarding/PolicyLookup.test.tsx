import { screen } from '@testing-library/react'
import PolicyLookup from '@/src/pages/onboarding/PolicyLookup'
import { renderWithApp } from '@/src/test/renderWithApp'

const at = { route: '/policy-lookup', path: '/policy-lookup' }

test('finds a policy number typed loosely and goes to OTP', async () => {
  const { user } = renderWithApp(<PolicyLookup />, at)
  expect(screen.getByRole('radio', { name: 'Policy number' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await user.type(screen.getByLabelText('Policy number'), 'agr 2026 004417')
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  expect(await screen.findByTestId('location')).toHaveTextContent(
    '/otp-verification',
  )
})

test('finds a national ID and goes to OTP', async () => {
  const { user } = renderWithApp(<PolicyLookup />, at)
  await user.click(screen.getByRole('radio', { name: 'ID number' }))
  await user.type(screen.getByLabelText('ID number'), '31234567')
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  expect(await screen.findByTestId('location')).toHaveTextContent(
    '/otp-verification',
  )
})

test('unknown numbers get one neutral message and a sign-up link', async () => {
  const { user } = renderWithApp(<PolicyLookup />, at)
  await user.type(screen.getByLabelText('Policy number'), 'AGR-2026-999999')
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    "We couldn't find a policy with that number.",
  )
  await user.click(
    screen.getByRole('button', { name: 'Sign up with my phone number' }),
  )
  expect(screen.getByTestId('location')).toHaveTextContent('/phone-entry')
})

test('the message for an unknown ID is identical', async () => {
  const { user } = renderWithApp(<PolicyLookup />, at)
  await user.click(screen.getByRole('radio', { name: 'ID number' }))
  await user.type(screen.getByLabelText('ID number'), '11111111')
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    "We couldn't find a policy with that number.",
  )
})

test('an empty box asks for a number', async () => {
  const { user } = renderWithApp(<PolicyLookup />, at)
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Enter your number first.',
  )
})
