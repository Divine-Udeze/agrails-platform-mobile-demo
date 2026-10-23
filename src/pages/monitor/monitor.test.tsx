import {
  act,
  fireEvent,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { useLocation } from 'react-router-dom'
import { afterEach, vi } from 'vitest'
import MonitorDetail, {
  useMonitorSeries,
} from '@/src/pages/monitor/MonitorDetail'
import { DRY_WEEK_RATIO, isDryWeek } from '@/src/pages/monitor/signals'
import MonitorList from '@/src/pages/monitor/MonitorList'
import * as monitorService from '@/src/services/monitorService'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'
import type { MonitorSeries } from '@/src/types'

afterEach(() => vi.restoreAllMocks())

function Loc() {
  const l = useLocation()
  return <div data-testid='loc'>{l.pathname + l.search}</div>
}

test('list shows each farm with its health ring and signals', () => {
  renderWithApp(<MonitorList />, {
    route: '/monitor',
    path: '/monitor',
    state: seededState(),
  })
  const links = screen.getAllByRole('link', {
    name: /^(Lower Shamba|Machakos Plot|Tea Garden)/,
  })
  expect(links).toHaveLength(3)
  expect(links[0]).toHaveAttribute('href', '/monitor/farm-maize')
  expect(screen.getByText(/Drought index: Severe drought/)).toBeInTheDocument()
  expect(
    within(links[0]).getByText('All signals look good'),
  ).toBeInTheDocument()
})

test('list shows an empty state without farms', () => {
  renderWithApp(<MonitorList />, {
    route: '/monitor',
    path: '/monitor',
    state: { ...seededState(), farms: [] },
  })
  expect(screen.getByText('No farms to watch yet')).toBeInTheDocument()
})

test('list empty state offers adding a farm', async () => {
  const { user } = renderWithApp(<MonitorList />, {
    route: '/monitor',
    path: '/monitor',
    state: { ...seededState(), farms: [] },
  })
  await user.click(screen.getByRole('button', { name: 'Add farm' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/add-farm')
})

const detail = (id: string, tab = '') => ({
  route: `/monitor/${id}${tab ? `?tab=${tab}` : ''}`,
  path: '/monitor/:farmId',
  state: seededState(),
})

test('detail opens on crop health with a takeaway and chart', async () => {
  renderWithApp(<MonitorDetail />, detail('farm-maize'))
  expect(
    await screen.findByRole('img', { name: 'Crop greenness (NDVI) by week' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Crop health' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(screen.getByText(/Your Maize is growing well/)).toBeInTheDocument()
})

test('switching tabs shows rainfall, drought and temperature views', async () => {
  const { user } = renderWithApp(<MonitorDetail />, detail('farm-beans'))
  await user.click(await screen.findByRole('tab', { name: 'Rainfall' }))
  expect(
    screen.getByRole('img', { name: 'Weekly rainfall in mm' }),
  ).toBeInTheDocument()
  expect(
    screen.getByText(/below normal in the last 4 weeks/),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Drought' }))
  expect(
    screen.getByText(
      'Your area is in drought. If harvests fail, your insurance can pay out.',
    ),
  ).toBeInTheDocument()
  expect(screen.getByTestId('gauge-needle')).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Temperature' }))
  expect(
    screen.getByRole('img', { name: 'Weekly lowest and highest temperature' }),
  ).toBeInTheDocument()
  expect(screen.getByText(/very hot weeks/)).toBeInTheDocument()
})

test('tab can be deep-linked', async () => {
  renderWithApp(<MonitorDetail />, detail('farm-beans', 'spi'))
  expect(await screen.findByRole('tab', { name: 'Drought' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

test('an invalid tab falls back to crop health', async () => {
  renderWithApp(<MonitorDetail />, detail('farm-beans', 'bogus'))
  expect(
    await screen.findByRole('tab', { name: 'Crop health' }),
  ).toHaveAttribute('aria-selected', 'true')
  expect(screen.getAllByRole('tab', { selected: true })).toHaveLength(1)
})

test('choosing a tab updates ?tab= and replaces history', async () => {
  const { user } = renderWithApp(<MonitorDetail />, {
    ...detail('farm-beans'),
    extra: <Loc />,
  })
  await user.click(await screen.findByRole('tab', { name: 'Rainfall' }))
  expect(screen.getByTestId('loc')).toHaveTextContent(
    '/monitor/farm-beans?tab=rain',
  )
})

test('unknown farm shows Not Found', () => {
  renderWithApp(<MonitorDetail />, detail('nope'))
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})

test('unknown farm shows Not Found even with a tab', () => {
  renderWithApp(<MonitorDetail />, detail('nope', 'rain'))
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
})

describe('accessible tabs', () => {
  test('tablist, tab and tabpanel wiring', async () => {
    renderWithApp(<MonitorDetail />, detail('farm-beans', 'rain'))
    const list = await screen.findByRole('tablist', {
      name: 'Farm health views',
    })
    const tabs = within(list).getAllByRole('tab')
    expect(tabs.map((x) => x.textContent)).toEqual([
      'Crop health',
      'Rainfall',
      'Drought',
      'Temperature',
    ])
    const panel = screen.getByRole('tabpanel')
    expect(panel).toHaveAttribute('id')
    const selected = screen.getByRole('tab', { name: 'Rainfall' })
    expect(panel).toHaveAttribute('aria-labelledby', selected.id)
    expect(panel).toHaveAccessibleName('Rainfall')
    tabs.forEach((x) => {
      expect(x).toHaveAttribute('aria-controls', panel.id)
      expect(x).toHaveAttribute('id')
    })
  })

  test('roving tabindex: only the selected tab is tabbable', async () => {
    const { user } = renderWithApp(<MonitorDetail />, detail('farm-beans'))
    await screen.findByRole('tablist')
    const index = () =>
      screen.getAllByRole('tab').map((x) => x.getAttribute('tabindex'))
    expect(index()).toEqual(['0', '-1', '-1', '-1'])
    await user.click(screen.getByRole('tab', { name: 'Drought' }))
    expect(index()).toEqual(['-1', '-1', '0', '-1'])
  })

  test('Up and Down move within the same column of the 2x2 grid', async () => {
    const { user } = renderWithApp(<MonitorDetail />, detail('farm-beans'))
    const tab = (name: string) => screen.getByRole('tab', { name })
    ;(await screen.findByRole('tab', { name: 'Crop health' })).focus()
    await user.keyboard('{ArrowDown}')
    expect(tab('Drought')).toHaveFocus()
    expect(tab('Drought')).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowUp}')
    expect(tab('Crop health')).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(tab('Drought')).toHaveFocus()
    // Down from the last row wraps to the first row of the same column
    await user.keyboard('{ArrowDown}')
    expect(tab('Crop health')).toHaveFocus()
    await user.keyboard('{ArrowRight}{ArrowDown}')
    expect(tab('Temperature')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(tab('Rainfall')).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(tab('Temperature')).toHaveFocus()
  })

  test('arrow keys move and wrap; Home and End jump', async () => {
    const { user } = renderWithApp(<MonitorDetail />, detail('farm-beans'))
    const first = await screen.findByRole('tab', { name: 'Crop health' })
    first.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Rainfall' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Rainfall' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Temperature' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Temperature' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Crop health' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Temperature' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Crop health' })).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Crop health')
  })
})

describe('series loading', () => {
  test('shows a loading state while the series is pending', async () => {
    vi.spyOn(monitorService, 'getSeries').mockReturnValue(new Promise(() => {}))
    renderWithApp(<MonitorDetail />, detail('farm-beans'))
    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  test('failure shows a generic error; retry recovers', async () => {
    vi.spyOn(monitorService, 'getSeries').mockRejectedValueOnce(
      new Error('offline'),
    )
    const { user } = renderWithApp(<MonitorDetail />, detail('farm-beans'))
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('tablist')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  test('survives StrictMode double effects', async () => {
    renderWithApp(<MonitorDetail />, { ...detail('farm-beans'), strict: true })
    expect(await screen.findByRole('tablist')).toBeInTheDocument()
  })

  test('hook: a stale series for another farm never shows', async () => {
    const state = seededState()
    const [a, b] = [state.farms[0], state.farms[1]]
    const { result, rerender } = renderHook(
      ({ farm }) => useMonitorSeries(farm),
      { initialProps: { farm: a } },
    )
    await waitFor(() => expect(result.current.series).not.toBeNull())
    vi.spyOn(monitorService, 'getSeries').mockReturnValue(new Promise(() => {}))
    rerender({ farm: b })
    expect(result.current.series).toBeNull()
    expect(result.current.error).toBe(false)
  })

  test('hook: a late response for the previous farm is ignored', async () => {
    const state = seededState()
    const [a, b] = [state.farms[0], state.farms[1]]
    let resolveA: (s: MonitorSeries) => void = () => {}
    let staleSettled = false
    const stale = new Promise<MonitorSeries>((r) => (resolveA = r)).then(
      (v) => {
        staleSettled = true
        return v
      },
    )
    const spy = vi.spyOn(monitorService, 'getSeries').mockReturnValueOnce(stale)
    const { result, rerender } = renderHook(
      ({ farm }) => useMonitorSeries(farm),
      { initialProps: { farm: a } },
    )
    rerender({ farm: b })
    await waitFor(() => expect(result.current.series).not.toBeNull())
    const forB = result.current.series
    expect(forB).toEqual(monitorService.seriesFor(b))
    await act(async () => {
      resolveA(monitorService.seriesFor(a))
    })
    await waitFor(() => expect(staleSettled).toBe(true))
    await waitFor(() => expect(result.current.series).toBe(forB))
    expect(result.current.series).not.toEqual(monitorService.seriesFor(a))
    expect(spy).toHaveBeenCalledTimes(2)
  })

  test('hook: retry never renders the stale error again', async () => {
    const farm = seededState().farms[0]
    vi.spyOn(monitorService, 'getSeries').mockRejectedValueOnce(
      new Error('offline'),
    )
    const seen: boolean[] = []
    const { result } = renderHook(() => {
      const r = useMonitorSeries(farm)
      seen.push(r.error)
      return r
    })
    await waitFor(() => expect(result.current.error).toBe(true))
    const mark = seen.length
    act(() => result.current.retry())
    expect(seen.slice(mark).every((e) => e === false)).toBe(true)
    await waitFor(() => expect(result.current.series).not.toBeNull())
    expect(result.current.error).toBe(false)
  })

  test('hook: a new farm object with the same id and crop does not refetch', async () => {
    const farm = seededState().farms[0]
    const spy = vi.spyOn(monitorService, 'getSeries')
    const { result, rerender } = renderHook(({ f }) => useMonitorSeries(f), {
      initialProps: { f: farm },
    })
    await waitFor(() => expect(result.current.series).not.toBeNull())
    rerender({ f: { ...farm, healthScore: 1 } })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(result.current.series).not.toBeNull()
  })
})

describe('charts on the detail page', () => {
  test('tap to inspect works on the weekly line chart', async () => {
    renderWithApp(<MonitorDetail />, detail('farm-beans'))
    await screen.findByRole('tablist')
    const plot = screen.getByTestId('plot-hit')
    plot.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 320, height: 190 }) as DOMRect
    fireEvent.click(plot, { clientX: 315, clientY: 90 })
    const tip = screen.getAllByRole('status').at(-1)!
    expect(tip).toHaveTextContent(/^\d+ \w{3}-?\d/)
  })

  test('the heat threshold line does not block taps on week rows', async () => {
    renderWithApp(<MonitorDetail />, detail('farm-beans', 'heat'))
    const chart = await screen.findByRole('img', {
      name: 'Weekly lowest and highest temperature',
    })
    const line = chart.querySelector('line[stroke-dasharray]')!
    expect(line.closest('g')).toHaveStyle({ pointerEvents: 'none' })
  })
})

describe('insight box, units and chart details', () => {
  const insight = () => screen.getAllByRole('status')[0]

  test('the insight box is tinted by the active tab signal', async () => {
    const { user } = renderWithApp(<MonitorDetail />, detail('farm-beans'))
    await screen.findByRole('tablist')
    expect(insight()).toHaveAttribute('data-status', 'warning') // ndvi: stressed
    await user.click(screen.getByRole('tab', { name: 'Drought' }))
    expect(insight()).toHaveAttribute('data-status', 'danger')
    expect(insight()).toHaveTextContent(/in drought/)
    await user.click(screen.getByRole('tab', { name: 'Rainfall' }))
    expect(insight()).toHaveAttribute('data-status', 'danger')
  })

  test('a healthy farm gets the good tint on every tab', async () => {
    const { user } = renderWithApp(<MonitorDetail />, detail('farm-maize'))
    await screen.findByRole('tablist')
    for (const name of ['Crop health', 'Rainfall', 'Drought', 'Temperature']) {
      await user.click(screen.getByRole('tab', { name }))
      expect(insight()).toHaveAttribute('data-status', 'good')
    }
  })

  test('season totals keep each number with its unit and only break at the dot', async () => {
    renderWithApp(<MonitorDetail />, detail('farm-beans', 'rain'))
    const raw = { normalizer: (x: string) => x } // keep the non-breaking spaces
    const actual = await screen.findByText(/^This season \d+\u00a0mm$/, raw)
    const normal = screen.getByText(/^Normal \d+\u00a0mm$/, raw)
    expect(actual.parentElement).toBe(normal.parentElement)
    expect(actual.className).toMatch(/nowrap/)
    expect(normal.className).toMatch(/nowrap/)
  })

  test('the heat sentence comes from the shared threshold', async () => {
    renderWithApp(<MonitorDetail />, detail('farm-beans', 'heat'))
    expect(await screen.findByText(/above 32°C/)).toBeInTheDocument()
  })

  test('NDVI chart shows two decimals', async () => {
    renderWithApp(<MonitorDetail />, detail('farm-beans'))
    const chart = await screen.findByRole('img', {
      name: 'Crop greenness (NDVI) by week',
    })
    const ticks = [...chart.querySelectorAll('text')]
      .map((t) => t.textContent ?? '')
      .filter((t) => /^0\.\d+$/.test(t))
    expect(ticks.length).toBeGreaterThan(0)
    ticks.forEach((t) => expect(t).toMatch(/^0\.\d\d$/))
  })

  test('rain bars highlight exactly the dry weeks', async () => {
    renderWithApp(<MonitorDetail />, detail('farm-beans', 'rain'))
    const chart = await screen.findByRole('img', {
      name: 'Weekly rainfall in mm',
    })
    const s = monitorService.seriesFor({ id: 'farm-beans', crop: 'beans' })
    const dry = s.rainfallMm.filter((v, i) =>
      isDryWeek(v, s.rainfallNormalMm[i]),
    ).length
    expect(DRY_WEEK_RATIO).toBe(0.7)
    expect(dry).toBeGreaterThan(0)
    expect(chart.querySelectorAll('[data-highlight="true"]')).toHaveLength(dry)
  })

  const sparseSeries = (spi: number): MonitorSeries => {
    const s = monitorService.seriesFor({ id: 'farm-maize', crop: 'maize' })
    return { ...s, spi: s.spi.map(() => spi) }
  }
  const spiLine = (chart: HTMLElement) =>
    chart.querySelector('[data-testid="line-path"]')!.getAttribute('stroke')

  test.each([
    [-1.68, '#c62828', 'danger'],
    [-1.2, '#c77700', 'warning'],
    [0.2, '#2f9e5a', 'good'],
    [1.2, 'var(--rain-600)', 'good'],
    [2.4, '#c77700', 'warning'],
  ])('SPI %s colours the line %s', async (spi, colour, status) => {
    vi.spyOn(monitorService, 'getSeries').mockResolvedValue(sparseSeries(spi))
    renderWithApp(<MonitorDetail />, detail('farm-maize', 'spi'))
    const chart = await screen.findByRole('img', {
      name: 'Drought index by week',
    })
    expect(spiLine(chart as unknown as HTMLElement)).toBe(colour)
    expect(insight()).toHaveAttribute('data-status', status)
  })

  test('extremely wet: gauge segment for the current value matches the warning status', async () => {
    vi.spyOn(monitorService, 'getSeries').mockResolvedValue(sparseSeries(2.4))
    renderWithApp(<MonitorDetail />, detail('farm-maize', 'spi'))
    const gauge = await screen.findByRole('img', {
      name: 'Drought index (SPI) 2.4',
    })
    const strokes = [...gauge.querySelectorAll('path[stroke]')].map((p) =>
      p.getAttribute('stroke'),
    )
    expect(strokes[strokes.length - 1]).toBe('#c77700')
  })
})
