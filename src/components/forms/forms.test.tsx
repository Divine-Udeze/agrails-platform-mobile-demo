import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { CropPicker } from '@/src/components/forms/CropPicker'
import { Field } from '@/src/components/forms/Field'
import { OtpInput } from '@/src/components/forms/OtpInput'
import type { Crop } from '@/src/types'

function OtpHarness({ onDone }: { onDone: (v: string) => void }) {
  const [v, setV] = useState('')
  return (
    <OtpInput
      value={v}
      onChange={(next) => {
        setV(next)
        onDone(next)
      }}
    />
  )
}

test('OtpInput moves focus as digits are typed and ignores letters', async () => {
  const user = userEvent.setup()
  const onDone = vi.fn()
  render(<OtpHarness onDone={onDone} />)
  await user.click(screen.getByLabelText('Digit 1'))
  await user.keyboard('12a3456')
  expect(onDone).toHaveBeenLastCalledWith('123456')
  expect(screen.getByLabelText('Digit 6')).toHaveValue('6')
})

test('OtpInput backspace clears the previous digit', async () => {
  const user = userEvent.setup()
  const onDone = vi.fn()
  render(<OtpHarness onDone={onDone} />)
  await user.click(screen.getByLabelText('Digit 1'))
  await user.keyboard('12{Backspace}')
  expect(onDone).toHaveBeenLastCalledWith('1')
})

test('OtpInput accepts a pasted code', async () => {
  const user = userEvent.setup()
  const onDone = vi.fn()
  render(<OtpHarness onDone={onDone} />)
  await user.click(screen.getByLabelText('Digit 1'))
  await user.paste('123-456')
  expect(onDone).toHaveBeenLastCalledWith('123456')
})

test('CropPicker is a radio group', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn<(c: Crop) => void>()
  render(<CropPicker value='beans' onChange={onChange} label='Main crop' />)
  expect(
    screen.getByRole('radiogroup', { name: 'Main crop' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: /beans/i })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await user.click(screen.getByRole('radio', { name: /tea/i }))
  expect(onChange).toHaveBeenCalledWith('tea')
})

test('Field links its label and shows errors as alerts', () => {
  render(
    <Field id='n' label='Name' error='Required'>
      <input id='n' />
    </Field>,
  )
  expect(screen.getByLabelText('Name')).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Required')
})

test('OtpInput treats a multi-digit change (autofill) like a paste', () => {
  const onDone = vi.fn()
  render(<OtpHarness onDone={onDone} />)
  fireEvent.change(screen.getByLabelText('Digit 1'), {
    target: { value: '123456' },
  })
  expect(onDone).toHaveBeenLastCalledWith('123456')
})

test('OtpInput treats an empty change (Android backspace) as deleting that digit', () => {
  const onDone = vi.fn()
  render(<OtpHarness onDone={onDone} />)
  fireEvent.change(screen.getByLabelText('Digit 1'), {
    target: { value: '123' },
  })
  fireEvent.change(screen.getByLabelText('Digit 3'), { target: { value: '' } })
  expect(onDone).toHaveBeenLastCalledWith('12')
})

test('OtpInput can be disabled', () => {
  render(<OtpInput value='' onChange={() => {}} disabled />)
  expect(screen.getByLabelText('Digit 1')).toBeDisabled()
  expect(screen.getByLabelText('Digit 6')).toBeDisabled()
})
