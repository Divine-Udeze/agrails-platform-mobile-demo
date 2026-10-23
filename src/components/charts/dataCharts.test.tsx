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

test('BarChart draws the reference label on a pill after the bars', () => {
  render(
    <BarChart
      bars={[
        { label: 'a', value: 2.5 },
        { label: 'b', value: 1.1 },
      ]}
      reference={{ value: 2.3, label: 'Average 2.3 t' }}
      formatValue={(v) => `${v} t`}
      ariaLabel='Yield'
    />,
  )
  const svg = screen.getByRole('img', { name: 'Yield' })
  const pill = screen.getByTestId('ref-pill')
  const text = screen.getByText('Average 2.3 t')
  const lastBar = [...svg.querySelectorAll('[data-bar]')].pop() as Element
  const after = (a: Element, b: Element) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
  expect(after(lastBar, pill)).toBeTruthy()
  expect(after(pill, text)).toBeTruthy()
})

test('BarChart widens the left pad for long tick labels', () => {
  render(
    <BarChart
      bars={[
        { label: 'a', value: 1000 },
        { label: 'b', value: 500 },
      ]}
      formatValue={(v) => `${v} mm`}
      ariaLabel='Rain'
    />,
  )
  const svg = screen.getByRole('img', { name: 'Rain' })
  const first = svg.querySelector('line') as Element
  expect(Number(first.getAttribute('x1'))).toBeGreaterThan(36)
})
