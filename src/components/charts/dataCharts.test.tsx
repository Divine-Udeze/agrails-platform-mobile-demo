import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BarChart } from '@/src/components/charts/BarChart'
import { LineChart } from '@/src/components/charts/LineChart'
import { RangeStrip } from '@/src/components/charts/RangeStrip'

test('LineChart draws band and marker and shows a tooltip on tap', async () => {
  const user = userEvent.setup()
  render(
    <LineChart
      values={[0.3, 0.5, 0.7]}
      labels={['1 Sep', '8 Sep', '15 Sep']}
      band={{ from: 0.45, to: 0.85, label: 'Healthy range' }}
      markerIndex={2}
      markerLabel='Today'
      formatValue={(v) => v.toFixed(2)}
      ariaLabel='Crop health'
    />,
  )
  expect(screen.getByRole('img', { name: 'Crop health' })).toBeInTheDocument()
  expect(screen.getByText('Healthy range')).toBeInTheDocument()
  expect(screen.getByText('Today')).toBeInTheDocument()
  await user.click(screen.getByTestId('hit-1'))
  expect(screen.getByRole('status')).toHaveTextContent('8 Sep')
  expect(screen.getByRole('status')).toHaveTextContent('0.50')
  await user.click(screen.getByTestId('hit-1'))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

test('BarChart marks highlighted bars and draws a labelled reference line', async () => {
  const user = userEvent.setup()
  render(
    <BarChart
      bars={[
        { label: '2018', value: 2.5 },
        { label: '2019', value: 1.1, highlight: true, color: 'var(--danger)' },
      ]}
      reference={{ value: 2.3, label: 'Average' }}
      formatValue={(v) => `${v} t/ha`}
      ariaLabel='Yield history'
    />,
  )
  const svg = screen.getByRole('img', { name: 'Yield history' })
  expect(svg.querySelectorAll('[data-bar]')).toHaveLength(2)
  expect(svg.querySelectorAll('[data-highlight="true"]')).toHaveLength(1)
  expect(screen.getByText('Average')).toBeInTheDocument()
  await user.click(screen.getByTestId('hit-1'))
  expect(screen.getByRole('status')).toHaveTextContent('2019')
  expect(screen.getByRole('status')).toHaveTextContent('1.1 t/ha')
})

test('RangeStrip flags rows and shows the threshold', () => {
  render(
    <RangeStrip
      rows={[
        { label: '1 Sep', min: 13, max: 28 },
        { label: '8 Sep', min: 14, max: 34, flagged: true },
      ]}
      unit='°C'
      threshold={{ value: 32, label: '32°C' }}
      ariaLabel='Temperature'
    />,
  )
  const svg = screen.getByRole('img', { name: 'Temperature' })
  expect(svg.querySelectorAll('[data-flagged="true"]')).toHaveLength(1)
  expect(screen.getByText('32°C')).toBeInTheDocument()
})
