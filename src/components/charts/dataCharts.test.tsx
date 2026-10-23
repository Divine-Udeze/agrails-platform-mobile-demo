import { readFileSync } from 'node:fs'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BarChart, HEX, whiteOnBar } from '@/src/components/charts/BarChart'
import { CHAR_W } from '@/src/components/charts/geometry'
import { Donut } from '@/src/components/charts/Donut'
import { LineChart } from '@/src/components/charts/LineChart'
import { RangeStrip } from '@/src/components/charts/RangeStrip'

/** Taps the LineChart plot at an x in viewBox units (the mocked rect is 320 wide). */
function tapPlot(x: number) {
  const plot = screen.getByTestId('plot-hit')
  plot.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 320,
      height: 190,
      right: 320,
      bottom: 190,
    }) as DOMRect
  fireEvent.click(plot, { clientX: x, clientY: 80 })
}

test('LineChart draws band and marker and shows a tooltip on tap', () => {
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
  tapPlot(150)
  expect(screen.getByRole('status')).toHaveTextContent('8 Sep')
  expect(screen.getByRole('status')).toHaveTextContent('0.50')
  tapPlot(150)
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

test('RangeStrip threshold line lets taps through to the rows', () => {
  render(
    <RangeStrip
      rows={[{ label: '1 Sep', min: 13, max: 34, flagged: true }]}
      unit='°C'
      threshold={{ value: 32, label: '32°C' }}
      ariaLabel='Temperature'
    />,
  )
  const svg = screen.getByRole('img', { name: 'Temperature' })
  expect(svg.querySelector('line[stroke-dasharray]')?.closest('g')).toHaveStyle(
    {
      pointerEvents: 'none',
    },
  )
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

test('BarChart showValues labels each bar and drops the tick labels', () => {
  render(
    <BarChart
      bars={[
        { label: 'A', value: 2520 },
        { label: 'B', value: 14400 },
      ]}
      showValues
      formatValue={(v) => `KES ${v}`}
      ariaLabel='Compare'
    />,
  )
  const svg = screen.getByRole('img', { name: 'Compare' })
  expect(svg.querySelector('[data-value="A"]')).toHaveTextContent('KES 2520')
  expect(svg.querySelector('[data-value="B"]')).toHaveTextContent('KES 14400')
  expect(svg.querySelectorAll('text')).toHaveLength(4)
})

test('Donut renders segments, centre label and formatted legend values', () => {
  const { container } = render(
    <Donut
      ariaLabel='Split'
      centerLabel='5,040'
      centerSub='total'
      formatValue={(v) => `KES ${v}`}
      segments={[
        { label: 'Gov', value: 2520, color: 'red' },
        { label: 'You', value: 2520, color: 'green' },
      ]}
    />,
  )
  expect(screen.getByRole('img', { name: 'Split' })).toBeInTheDocument()
  expect(container.querySelectorAll('[data-segment]')).toHaveLength(2)
  expect(screen.getByText('5,040')).toBeInTheDocument()
  expect(screen.getByText('total')).toBeInTheDocument()
  const rows = container.querySelectorAll('li')
  expect(rows).toHaveLength(2)
  expect(rows[0]).toHaveTextContent('Gov')
  expect(rows[0]).toHaveTextContent('KES 2520')
  expect(rows[1]).toHaveTextContent('You')
  expect(rows[1]).toHaveTextContent('KES 2520')
  expect(screen.getByText('5,040')).toHaveAttribute('data-size', 'lg')
})

test('Donut steps the centre text down for long figures', () => {
  render(
    <Donut
      ariaLabel='Split'
      centerLabel='294,000'
      formatValue={String}
      segments={[{ label: 'A', value: 1, color: 'red' }]}
    />,
  )
  expect(screen.getByText('294,000')).toHaveAttribute('data-size', 'sm')
})

const WEEKS = Array.from({ length: 5 }, (_, i) => `${i + 1} Sep`)
const lineProps = {
  values: [0.3, 0.5, 0.7, 0.6, 0.4],
  labels: WEEKS,
  formatValue: (v: number) => v.toFixed(2),
  ariaLabel: 'Line',
}

test('LineChart: tapping between points selects the nearest one', () => {
  render(<LineChart {...lineProps} />)
  // x for index i is 36 + i * 68 (W 320, pads 36 and 12); 36 + 68 * 1.4 = 131
  tapPlot(131)
  expect(screen.getByRole('status')).toHaveTextContent('2 Sep')
  tapPlot(180) // between index 2 (172) and 3 (240), nearer 2
  expect(screen.getByRole('status')).toHaveTextContent('3 Sep')
  tapPlot(215) // nearer index 3
  expect(screen.getByRole('status')).toHaveTextContent('4 Sep')
})

test('LineChart: taps beyond the plot edges select the first and last point', () => {
  render(<LineChart {...lineProps} />)
  tapPlot(2)
  expect(screen.getByRole('status')).toHaveTextContent('1 Sep')
  tapPlot(319)
  expect(screen.getByRole('status')).toHaveTextContent('5 Sep')
})

const PLOT_TOP = 28

function headerOf() {
  const key = screen.getByTestId('band-key')
  return { key, text: key.nextElementSibling as Element }
}

test('LineChart: band key and Today sit in a header above the plot', () => {
  render(
    <LineChart
      {...lineProps}
      yDomain={[0, 1]}
      band={{ from: 0.45, to: 0.85, label: 'Healthy range' }}
      markerIndex={4}
      markerLabel='Today'
    />,
  )
  const { key, text } = headerOf()
  const today = screen.getByText('Today')
  expect(text).toHaveTextContent('Healthy range')
  // swatch and baselines are above the plot top
  expect(
    Number(key.getAttribute('y')) + Number(key.getAttribute('height')),
  ).toBeLessThanOrEqual(PLOT_TOP)
  expect(Number(text.getAttribute('y'))).toBeLessThan(PLOT_TOP)
  expect(Number(today.getAttribute('y'))).toBeLessThan(PLOT_TOP)
  // key on the left, Today right-aligned, and they do not collide
  expect(today).toHaveAttribute('text-anchor', 'end')
  const keyEnd =
    Number(text.getAttribute('x')) + 'Healthy range'.length * CHAR_W
  const todayStart = Number(today.getAttribute('x')) - 'Today'.length * CHAR_W
  expect(keyEnd).toBeLessThan(todayStart)
  // no pill inside the plot, and the line never enters the header
  expect(screen.queryByTestId('band-pill')).not.toBeInTheDocument()
  const ys = (screen.getByTestId('line-path').getAttribute('d') ?? '')
    .split(/[ML]/)
    .filter(Boolean)
    .map((p) => Number(p.trim().split(' ')[1]))
  ys.forEach((y) => expect(y).toBeGreaterThanOrEqual(PLOT_TOP))
})

test('LineChart: Today follows a middle marker, centred on it', () => {
  render(
    <LineChart
      {...lineProps}
      band={{ from: 0.45, to: 0.85, label: 'Normal' }}
      markerIndex={2}
      markerLabel='Today'
    />,
  )
  const today = screen.getByTestId('marker-label')
  expect(today).toHaveAttribute('text-anchor', 'middle')
  expect(Number(today.getAttribute('x'))).toBe(36 + 68 * 2)
})

test('LineChart: Today is start-aligned for a left marker when clear of the key', () => {
  render(<LineChart {...lineProps} markerIndex={0} markerLabel='Today' />)
  const today = screen.getByTestId('marker-label')
  expect(today).toHaveAttribute('text-anchor', 'start')
  expect(Number(today.getAttribute('x'))).toBe(36)
})

test('LineChart: Today drops to the right edge if it would hit the band key', () => {
  render(
    <LineChart
      {...lineProps}
      band={{ from: 0.45, to: 0.85, label: 'Healthy range' }}
      markerIndex={0}
      markerLabel='Today'
    />,
  )
  const today = screen.getByTestId('marker-label')
  expect(today).toHaveAttribute('text-anchor', 'end')
  expect(Number(today.getAttribute('x'))).toBe(320 - 12)
})

test('LineChart: Today stays inside the chart for a right marker', () => {
  render(<LineChart {...lineProps} markerIndex={4} markerLabel='Today' />)
  const today = screen.getByTestId('marker-label')
  expect(today).toHaveAttribute('text-anchor', 'end')
  expect(Number(today.getAttribute('x'))).toBeLessThanOrEqual(320)
})

test('LineChart: a series starting inside the band cannot cover its label', () => {
  render(
    <LineChart
      {...lineProps}
      values={[0, 0.1, -0.2, 0.3, 0.2]}
      yDomain={[-3, 3]}
      band={{ from: -1, to: 1, label: 'Normal' }}
    />,
  )
  const { key, text } = headerOf()
  expect(text).toHaveTextContent('Normal')
  expect(Number(key.getAttribute('x'))).toBeGreaterThanOrEqual(36)
  expect(Number(text.getAttribute('y'))).toBeLessThan(PLOT_TOP)
})

const dated = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    label: `${((i * 7 + 6) % 28) + 1} Jul`,
    value: 20 + i,
  }))
const barLabels = (svg: Element) =>
  [...svg.querySelectorAll('text')]
    .map((t) => t.textContent)
    .filter((t) => /Jul/.test(t ?? ''))

test('BarChart thins x labels that would overlap, keeping first and last', () => {
  const bars = dated(16)
  render(
    <BarChart bars={bars} formatValue={(v) => `${v} mm`} ariaLabel='Weekly' />,
  )
  const shown = barLabels(screen.getByRole('img', { name: 'Weekly' }))
  expect(shown.length).toBeLessThan(16)
  expect(shown.length).toBeGreaterThan(2)
  expect(shown[0]).toBe(bars[0].label)
  expect(shown[shown.length - 1]).toBe(bars[15].label)
})

test('BarChart x labels never sit closer than their estimated width', () => {
  render(
    <BarChart
      bars={dated(16)}
      formatValue={(v) => `${v} mm`}
      ariaLabel='Weekly'
    />,
  )
  const xs = [
    ...screen.getByRole('img', { name: 'Weekly' }).querySelectorAll('text'),
  ]
    .filter((t) => /Jul/.test(t.textContent ?? ''))
    .map((t) => Number(t.getAttribute('x')))
  const gaps = xs.slice(1).map((x, i) => x - xs[i])
  gaps.forEach((g) => expect(g).toBeGreaterThanOrEqual(6 * CHAR_W))
})

test('BarChart shows every label when they fit (10 short year labels)', () => {
  const bars = Array.from({ length: 10 }, (_, i) => ({
    label: String(16 + i),
    value: 2 + i / 10,
  }))
  render(
    <BarChart bars={bars} formatValue={(v) => `${v} t`} ariaLabel='Years' />,
  )
  const svg = screen.getByRole('img', { name: 'Years' })
  bars.forEach((b) =>
    expect(
      [...svg.querySelectorAll('text')].some((t) => t.textContent === b.label),
    ).toBe(true),
  )
})

test('BarChart shows both labels with two bars', () => {
  render(
    <BarChart
      bars={[
        { label: 'Today', value: 2 },
        { label: 'Later', value: 3 },
      ]}
      formatValue={(v) => `${v}`}
      ariaLabel='Two'
    />,
  )
  expect(screen.getByText('Today')).toBeInTheDocument()
  expect(screen.getByText('Later')).toBeInTheDocument()
})

test('RangeStrip anchors the threshold label inside the card when near the right edge', () => {
  render(
    <RangeStrip
      rows={[
        { label: '1 Sep', min: 13, max: 33 },
        { label: '8 Sep', min: 14, max: 34, flagged: true },
      ]}
      unit='°C'
      threshold={{ value: 32, label: 'Heat stress' }}
      ariaLabel='Temperature'
    />,
  )
  const label = screen.getByText('Heat stress')
  const line = screen
    .getByRole('img', { name: 'Temperature' })
    .querySelector('line[stroke-dasharray]') as Element
  expect(label).toHaveAttribute('text-anchor', 'end')
  expect(Number(label.getAttribute('x'))).toBeLessThan(
    Number(line.getAttribute('x1')),
  )
})

test('RangeStrip keeps the threshold label to the right when there is room', () => {
  render(
    <RangeStrip
      rows={[
        { label: '1 Sep', min: 5, max: 20 },
        { label: '8 Sep', min: 6, max: 45 },
      ]}
      unit='°C'
      threshold={{ value: 10, label: 'Heat' }}
      ariaLabel='Temperature'
    />,
  )
  expect(screen.getByText('Heat')).not.toHaveAttribute('text-anchor', 'end')
})

test('RangeStrip: the threshold pill sits above the first row', () => {
  render(
    <RangeStrip
      rows={[
        { label: '1 Sep', min: 13, max: 33 },
        { label: '8 Sep', min: 14, max: 34, flagged: true },
      ]}
      unit='°C'
      threshold={{ value: 32, label: 'Heat stress' }}
      ariaLabel='Temperature'
    />,
  )
  const pill = screen.getByTestId('threshold-pill')
  const firstHit = screen.getByTestId('hit-0')
  expect(
    Number(pill.getAttribute('y')) + Number(pill.getAttribute('height')),
  ).toBeLessThanOrEqual(Number(firstHit.getAttribute('y')))
})

describe('BarChart showValues avoids the reference line and pill', () => {
  const num = (e: Element | null, a: string) => Number(e!.getAttribute(a))
  const box = (svg: Element, name: string) => {
    const el = svg.querySelector(`[data-value="${name}"]`)!
    const w = (el.textContent ?? '').length * 6.6 * (14 / 12)
    const x = num(el, 'x')
    return {
      el,
      x1: x - w / 2,
      x2: x + w / 2,
      y1: num(el, 'y') - 12,
      y2: num(el, 'y') + 3,
    }
  }
  const pillBox = (svg: Element) => {
    const p = svg.querySelector('[data-testid="ref-pill"]')
    return {
      x1: num(p, 'x'),
      x2: num(p, 'x') + num(p, 'width'),
      y1: num(p, 'y'),
      y2: num(p, 'y') + num(p, 'height'),
    }
  }
  const overlap = (
    a: { x1: number; x2: number; y1: number; y2: number },
    b: { x1: number; x2: number; y1: number; y2: number },
  ) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1

  const draw = (
    bars: { label: string; value: number; color?: string }[],
    ref: number,
  ) => {
    render(
      <BarChart
        bars={bars}
        showValues
        reference={{ value: ref, label: 'Payout level 60%' }}
        formatValue={(v) => `${v} t/ha`}
        ariaLabel='Cmp'
      />,
    )
    return screen.getByRole('img', { name: 'Cmp' })
  }

  test('a label near the line moves inside a tall bar, in white', () => {
    const svg = draw(
      [
        { label: 'Normal', value: 1.2 },
        { label: 'Season', value: 0.54, color: '#c62828' },
      ],
      0.72,
    )
    const el = svg.querySelector('[data-value="Season"]')!
    expect(el).toHaveAttribute('data-placement', 'inside')
    expect(el.getAttribute('class')).toMatch(/valueTextInside/)
    const bar = svg.querySelector('[data-bar="Season"]')!
    expect(num(el, 'y')).toBeGreaterThan(num(bar, 'y'))
    expect(num(el, 'y')).toBeLessThan(num(bar, 'y') + num(bar, 'height'))
  })

  test('a label near the line under a short bar sits just below the line', () => {
    const svg = draw(
      [
        { label: 'Normal', value: 10 },
        { label: 'Season', value: 1 },
      ],
      1.3,
    )
    const el = svg.querySelector('[data-value="Season"]')!
    expect(el).toHaveAttribute('data-placement', 'below')
    const line = svg.querySelector('line[stroke-dasharray]')!
    expect(num(el, 'y')).toBeGreaterThan(num(line, 'y1'))
    expect(overlap(box(svg, 'Season'), pillBox(svg))).toBe(false)
  })

  test('labels away from the line stay above their bars', () => {
    const svg = draw(
      [
        { label: 'Normal', value: 10 },
        { label: 'Season', value: 5 },
      ],
      2,
    )
    expect(svg.querySelector('[data-value="Normal"]')).toHaveAttribute(
      'data-placement',
      'above',
    )
    expect(svg.querySelector('[data-value="Season"]')).toHaveAttribute(
      'data-placement',
      'above',
    )
  })

  test('the pill moves off a value label it would cover', () => {
    const svg = draw(
      [
        { label: 'Low', value: 6 },
        { label: 'High', value: 10 },
      ],
      9.2,
    )
    const pill = pillBox(svg)
    expect(overlap(box(svg, 'Low'), pill)).toBe(false)
    expect(overlap(box(svg, 'High'), pill)).toBe(false)
    // by default it sits flush right; it had to move to the roomier side
    expect(pill.x2).toBeLessThan(320 - 12)
  })
})

describe('BarChart inside-label contrast', () => {
  const inside = (color?: string) => {
    render(
      <BarChart
        bars={[
          { label: 'Normal', value: 1.2 },
          { label: 'Season', value: 0.54, color },
        ]}
        showValues
        reference={{ value: 0.72, label: 'Level' }}
        formatValue={(v) => `${v}`}
        ariaLabel='Contrast'
      />,
    )
    return screen
      .getByRole('img', { name: 'Contrast' })
      .querySelector('[data-value="Season"]')!
  }

  test('white text inside a danger bar', () => {
    expect(inside('#c62828').getAttribute('class')).toMatch(/valueTextInside/)
  })

  test('ink text inside a green bar', () => {
    const el = inside('#2f9e5a')
    expect(el).toHaveAttribute('data-placement', 'inside')
    expect(el.getAttribute('class')).not.toMatch(/valueTextInside/)
  })

  test('the chosen text colour reaches 4.5:1 on status colours', () => {
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => {
        const v = parseInt(hex.slice(i, i + 2), 16) / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    }
    for (const bar of [
      '#2f9e5a',
      '#c77700',
      '#c62828',
      ...Object.values(HEX),
    ]) {
      const text = whiteOnBar(bar) ? '#ffffff' : '#17201a'
      const [a, b] = [lum(bar), lum(text)].sort((x, y) => y - x)
      expect((a + 0.05) / (b + 0.05)).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('HEX matches tokens.css', () => {
    const css = readFileSync('src/styles/tokens.css', 'utf8')
    for (const [ref, hex] of Object.entries(HEX)) {
      const name = ref.slice(4, -1)
      expect(css).toMatch(new RegExp(`${name}:\\s*${hex};`, 'i'))
    }
  })

  test('gold bars get ink text, at least 4.5:1', () => {
    expect(whiteOnBar('var(--gold-500)')).toBe(false)
    expect(whiteOnBar('#e0a526')).toBe(false)
  })

  test('unknown colours fall back to white', () => {
    expect(whiteOnBar('rebeccapurple')).toBe(true)
  })
})
