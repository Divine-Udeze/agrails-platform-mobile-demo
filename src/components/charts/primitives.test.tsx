import { render, screen } from '@testing-library/react'
import { Donut } from '@/src/components/charts/Donut'
import { Gauge } from '@/src/components/charts/Gauge'
import { Ring } from '@/src/components/charts/Ring'
import { Sparkline } from '@/src/components/charts/Sparkline'

test('Sparkline draws one point per value', () => {
  render(
    <Sparkline
      values={[0.3, 0.5, 0.6]}
      status='warning'
      label='Crop health trend'
    />,
  )
  const svg = screen.getByRole('img', { name: 'Crop health trend' })
  expect(svg).toHaveAttribute('data-status', 'warning')
  expect(
    svg.querySelector('polyline')!.getAttribute('points')!.split(' '),
  ).toHaveLength(3)
})

test('Sparkline renders nothing for fewer than 2 values', () => {
  const { container } = render(<Sparkline values={[1]} label='x' />)
  expect(container).toBeEmptyDOMElement()
})

test('Ring shows its label and fills proportionally', () => {
  render(
    <Ring
      value={25}
      label='25'
      sublabel='score'
      ariaLabel='Health 25 of 100'
    />,
  )
  expect(
    screen.getByRole('img', { name: 'Health 25 of 100' }),
  ).toBeInTheDocument()
  expect(screen.getByText('25')).toBeInTheDocument()
  const arc = screen.getByTestId('ring-value')
  const [filled, total] = arc
    .getAttribute('stroke-dasharray')!
    .split(' ')
    .map(Number)
  expect(filled / total).toBeCloseTo(0.25, 2)
})

test('Donut draws a segment and legend row per value', () => {
  render(
    <Donut
      ariaLabel='Premium split'
      formatValue={(v) => `KES ${v}`}
      segments={[
        { label: 'Government pays', value: 2520, color: 'var(--rain-400)' },
        { label: 'You pay', value: 2520, color: 'var(--green-700)' },
      ]}
    />,
  )
  expect(
    screen
      .getByRole('img', { name: 'Premium split' })
      .querySelectorAll('[data-segment]'),
  ).toHaveLength(2)
  expect(screen.getByText('You pay')).toBeInTheDocument()
  expect(screen.getAllByText('KES 2520')).toHaveLength(2)
})

test('Gauge needle angle follows the value', () => {
  const bands = [
    { to: -1, color: 'red' },
    { to: 1, color: 'green' },
    { to: 3, color: 'blue' },
  ]
  const { rerender } = render(
    <Gauge
      value={-3}
      min={-3}
      max={3}
      bands={bands}
      valueLabel='-3'
      ariaLabel='SPI'
    />,
  )
  expect(screen.getByTestId('gauge-needle')).toHaveAttribute(
    'data-angle',
    '-90',
  )
  rerender(
    <Gauge
      value={0}
      min={-3}
      max={3}
      bands={bands}
      valueLabel='0'
      ariaLabel='SPI'
    />,
  )
  expect(screen.getByTestId('gauge-needle')).toHaveAttribute('data-angle', '0')
  rerender(
    <Gauge
      value={9}
      min={-3}
      max={3}
      bands={bands}
      valueLabel='9'
      ariaLabel='SPI'
    />,
  )
  expect(screen.getByTestId('gauge-needle')).toHaveAttribute('data-angle', '90')
})
