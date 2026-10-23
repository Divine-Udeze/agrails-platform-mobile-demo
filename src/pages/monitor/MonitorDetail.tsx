import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { BarChart } from '@/src/components/charts/BarChart'
import { Gauge } from '@/src/components/charts/Gauge'
import { LineChart } from '@/src/components/charts/LineChart'
import { RangeStrip } from '@/src/components/charts/RangeStrip'
import { Ring } from '@/src/components/charts/Ring'
import { Chip } from '@/src/components/common/Chip'
import { ErrorState, LoadingState } from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { Screen } from '@/src/components/common/Screen'
import { STATUS_COLOR } from '@/src/components/common/statusColor'
import { useFarm } from '@/src/context/AppContext'
import { CROPS, HEAT_STRESS_C } from '@/src/data/cropConfig'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/monitor/monitor.module.css'
import {
  farmSignals,
  isDryWeek,
  nearbyPercentile,
  RAIN_WARNING_PCT,
  type Signal,
} from '@/src/pages/monitor/signals'
import { getSeries } from '@/src/services/monitorService'
import type { Farm, MonitorSeries, Status } from '@/src/types'
import { formatDate, formatShortDate } from '@/src/utils/format'
import {
  classifyNdvi,
  classifySpi,
  healthStatus,
  heatStressWeeks,
  last,
  rainfallDeficitPct,
} from '@/src/utils/monitor'

type Tab = 'ndvi' | 'rain' | 'spi' | 'heat'
const TABS: Tab[] = ['ndvi', 'rain', 'spi', 'heat']
const TAB_COLS = 2 // the tab strip is a 2x2 grid

interface Loaded {
  key: string
  series: MonitorSeries | null
  error: boolean
}

/**
 * Loads the weekly series for a farm. Keyed by the farm's id and crop (not the
 * farm object), and only ever returns the series that belongs to the current
 * key, so a previous farm's data can never show.
 */
export function useMonitorSeries(farm?: Pick<Farm, 'id' | 'crop'>) {
  const id = farm?.id
  const crop = farm?.crop
  const key = `${id}:${crop}`
  const [state, setState] = useState<Loaded | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    setState(null)
    if (!id || !crop) {
      return
    }
    let live = true
    getSeries({ id, crop })
      .then((series) => {
        if (live) setState({ key, series, error: false })
      })
      .catch(() => {
        if (live) setState({ key, series: null, error: true })
      })
    return () => {
      live = false
    }
  }, [id, crop, key, attempt])
  const current = state?.key === key ? state : null
  const retry = () => {
    // clear the error in the handler so it is never painted again
    setState(null)
    setAttempt((n) => n + 1)
  }
  return {
    series: current?.series ?? null,
    error: current?.error ?? false,
    retry,
  }
}

function Insight({ status, children }: { status: Status; children: string }) {
  return (
    <p role='status' className={styles.insight} data-status={status}>
      {children}
    </p>
  )
}

function NdviTab({ farm, s }: { farm: Farm; s: MonitorSeries }) {
  const c = classifyNdvi(last(s.ndvi), farm.crop)
  const crop = t(`crop.${farm.crop}`)
  const [lo, hi] = CROPS[farm.crop].ndviHealthy
  return (
    <div className='stack'>
      <Insight status={c.status}>
        {t(`mon.ndvi.${c.status}`, {
          crop,
          pct: nearbyPercentile(farm.healthScore),
        })}
      </Insight>
      <section className='card'>
        <LineChart
          ariaLabel={t('mon.ndvi.chart')}
          values={s.ndvi}
          labels={s.weeks.map(formatShortDate)}
          yDomain={[0.1, 0.9]}
          band={{ from: lo, to: hi, label: t('mon.ndvi.band') }}
          markerIndex={s.ndvi.length - 1}
          markerLabel={t('mon.ndvi.today')}
          formatValue={(v) => v.toFixed(2)}
        />
      </section>
      <p className='muted' style={{ margin: 0 }}>
        {t('mon.ndvi.explain')}
      </p>
    </div>
  )
}

const mm = (v: number) => `${Math.round(v)}\u00a0mm`

function RainTab({ s, signal }: { s: MonitorSeries; signal: Signal }) {
  const deficit = rainfallDeficitPct(s)
  const takeaway =
    deficit >= RAIN_WARNING_PCT
      ? t('mon.rain.low', { pct: deficit })
      : deficit <= -RAIN_WARNING_PCT
        ? t('mon.rain.high', { pct: -deficit })
        : t('mon.rain.ok')
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
  const normalAvg = sum(s.rainfallNormalMm) / s.rainfallNormalMm.length
  return (
    <div className='stack'>
      <Insight status={signal.status}>{takeaway}</Insight>
      <section className='card stack-sm'>
        <BarChart
          ariaLabel={t('mon.rain.chart')}
          formatValue={mm}
          reference={{
            value: Math.round(normalAvg),
            label: t('mon.rain.normal'),
          }}
          bars={s.rainfallMm.map((v, i) => {
            const dry = isDryWeek(v, s.rainfallNormalMm[i])
            return {
              label: formatShortDate(s.weeks[i]),
              value: v,
              color: dry ? STATUS_COLOR.warning : 'var(--rain-400)',
              highlight: dry,
            }
          })}
        />
        <div className={styles.statRow}>
          <span className={styles.nowrap}>
            {t('mon.rain.actual', { n: Math.round(sum(s.rainfallMm)) })}
          </span>
          <span aria-hidden='true'> · </span>
          <span className={styles.nowrap}>
            {t('mon.rain.normalTotal', {
              n: Math.round(sum(s.rainfallNormalMm)),
            })}
          </span>
        </div>
      </section>
    </div>
  )
}

function SpiTab({ s }: { s: MonitorSeries }) {
  const value = last(s.spi)
  const c = classifySpi(value)
  // wet (but not extreme) reads blue; extreme wet is a warning, like the gauge
  const lineColor =
    c.status === 'good' && value >= 1
      ? 'var(--rain-600)'
      : STATUS_COLOR[c.status]
  const gauge = t('mon.spi.gauge', { value: value.toFixed(1) })
  return (
    <div className='stack'>
      <Insight status={c.status}>{t(`mon.spi.${c.status}`)}</Insight>
      <section className='card'>
        <Gauge
          value={value}
          min={-3}
          max={3}
          bands={[
            { to: -1.5, color: STATUS_COLOR.danger },
            { to: -1, color: STATUS_COLOR.warning },
            { to: 1, color: STATUS_COLOR.good },
            { to: 2, color: 'var(--rain-600)' },
            { to: 3, color: STATUS_COLOR.warning },
          ]}
          valueLabel={t(c.label)}
          caption={gauge}
          minLabel={t('mon.spi.dry')}
          maxLabel={t('mon.spi.wet')}
          ariaLabel={gauge}
        />
      </section>
      <section className='card'>
        <LineChart
          ariaLabel={t('mon.spi.chart')}
          values={s.spi}
          labels={s.weeks.map(formatShortDate)}
          yDomain={[-3, 3]}
          band={{ from: -1, to: 1, label: t('mon.spi.band') }}
          color={lineColor}
          formatValue={(v) => v.toFixed(1)}
        />
      </section>
    </div>
  )
}

function HeatTab({ s, signal }: { s: MonitorSeries; signal: Signal }) {
  const from = Math.max(0, s.weeks.length - 8)
  const hot = heatStressWeeks(s).filter((i) => i >= from)
  return (
    <div className='stack'>
      <Insight status={signal.status}>
        {hot.length
          ? t('mon.heat.some', { n: hot.length, t: HEAT_STRESS_C })
          : t('mon.heat.none')}
      </Insight>
      <section className='card'>
        <RangeStrip
          ariaLabel={t('mon.heat.chart')}
          unit='°C'
          threshold={{ value: HEAT_STRESS_C, label: t('mon.heat.threshold') }}
          rows={s.weeks.slice(from).map((w, k) => {
            const i = from + k
            return {
              label: formatShortDate(w),
              min: s.tempMinC[i],
              max: s.tempMaxC[i],
              flagged: s.tempMaxC[i] > HEAT_STRESS_C,
            }
          })}
        />
      </section>
    </div>
  )
}

export default function MonitorDetail() {
  const { farmId } = useParams()
  const [search, setSearch] = useSearchParams()
  const farm = useFarm(farmId)
  const { series, error, retry } = useMonitorSeries(farm)
  const base = useId()
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    ndvi: null,
    rain: null,
    spi: null,
    heat: null,
  })
  const param = search.get('tab')
  const tab: Tab = TABS.find((k) => k === param) ?? 'ndvi'

  if (!farm) return <NotFound />
  const status = healthStatus(farm.healthScore)
  const tabId = (k: Tab) => `${base}-tab-${k}`
  const panelId = `${base}-panel`

  const signals = series ? farmSignals(series, farm.crop) : []
  const sig = (k: Signal['key']) => signals.find((x) => x.key === k)!

  const select = (k: Tab) => {
    setSearch({ tab: k }, { replace: true })
    tabRefs.current[k]?.focus()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const at = TABS.indexOf(tab)
    let next: number
    if (e.key === 'ArrowRight') next = (at + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (at - 1 + TABS.length) % TABS.length
    // two columns: Up/Down move within the same column, wrapping
    else if (e.key === 'ArrowDown') next = (at + TAB_COLS) % TABS.length
    else if (e.key === 'ArrowUp')
      next = (at - TAB_COLS + TABS.length) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    else return
    e.preventDefault()
    select(TABS[next])
  }

  return (
    <Screen header={<Header title={farm.name} back='/monitor' />}>
      {error ? (
        <ErrorState kind='generic' onRetry={retry} />
      ) : !series ? (
        <LoadingState />
      ) : (
        <div className='stack'>
          <section className={`card ${styles.summary}`}>
            <Ring
              value={farm.healthScore}
              status={status}
              label={farm.healthScore}
              sublabel='/100'
              ariaLabel={t('farm.health', { score: farm.healthScore })}
            />
            <div className='stack-sm'>
              <Chip status={status}>{t(`status.${status}`)}</Chip>
              <div className='muted'>
                {t('mon.updated', {
                  date: formatDate(series.weeks[series.weeks.length - 1]),
                })}
              </div>
            </div>
          </section>
          <div
            role='tablist'
            aria-label={t('mon.tabs')}
            className={styles.tabs}
            onKeyDown={onKeyDown}
          >
            {TABS.map((k) => (
              <button
                key={k}
                ref={(el) => {
                  tabRefs.current[k] = el
                }}
                id={tabId(k)}
                type='button'
                role='tab'
                aria-selected={tab === k}
                aria-controls={panelId}
                tabIndex={tab === k ? 0 : -1}
                className={styles.tab}
                onClick={() => select(k)}
              >
                {t(`mon.tab.${k}`)}
              </button>
            ))}
          </div>
          <div
            role='tabpanel'
            id={panelId}
            aria-labelledby={tabId(tab)}
            className='fade-in'
            key={tab}
          >
            {tab === 'ndvi' && <NdviTab farm={farm} s={series} />}
            {tab === 'rain' && <RainTab s={series} signal={sig('rain')} />}
            {tab === 'spi' && <SpiTab s={series} />}
            {tab === 'heat' && <HeatTab s={series} signal={sig('heat')} />}
          </div>
        </div>
      )}
    </Screen>
  )
}
