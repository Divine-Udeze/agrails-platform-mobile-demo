import { render, screen } from '@testing-library/react'
import {
  CoverageBar,
  coverageProgress,
  coverageText,
} from '@/src/components/cards/CoverageBar'

const start = '2026-10-01T00:00:00.000Z'
const end = '2026-12-31T00:00:00.000Z'
const at = (iso: string) => new Date(iso)

test('coverage text before, during and after the season', () => {
  expect(coverageText(start, end, at('2026-09-21T00:00:00.000Z'))).toBe(
    'Starts in 10 days',
  )
  expect(coverageText(start, end, at('2026-12-21T00:00:00.000Z'))).toBe(
    '10 days left',
  )
  expect(coverageText(start, end, at('2027-01-05T00:00:00.000Z'))).toBe(
    'Ended 31 Dec 2026',
  )
})

test('the day before the start and the start day itself', () => {
  expect(coverageText(start, end, at('2026-09-30T08:00:00.000Z'))).toBe(
    'Starts tomorrow',
  )
  // 92 days from 1 Oct to 31 Dec inclusive means 91 whole days remain
  expect(coverageText(start, end, at('2026-10-01T08:00:00.000Z'))).toBe(
    '91 days left',
  )
})

test('the last day, one day left, and the day after the end', () => {
  expect(coverageText(start, end, at('2026-12-30T09:00:00.000Z'))).toBe(
    '1 day left',
  )
  expect(coverageText(start, end, at('2026-12-31T09:00:00.000Z'))).toBe(
    'Last day of cover',
  )
  expect(coverageText(start, end, at('2027-01-01T00:30:00.000Z'))).toBe(
    'Ended 31 Dec 2026',
  )
})

test('a one-day cover is the last day on its day only', () => {
  const day = '2026-11-10T00:00:00.000Z'
  expect(coverageText(day, day, at('2026-11-09T10:00:00.000Z'))).toBe(
    'Starts tomorrow',
  )
  expect(coverageText(day, day, at('2026-11-10T10:00:00.000Z'))).toBe(
    'Last day of cover',
  )
  expect(coverageText(day, day, at('2026-11-11T10:00:00.000Z'))).toBe(
    'Ended 10 Nov 2026',
  )
})

test('today is the Nairobi date, so the day turns over at 21:00 UTC', () => {
  // 20:59 UTC on 30 Dec is still 30 Dec in Nairobi; 21:00 UTC is 31 Dec
  expect(coverageText(start, end, at('2026-12-30T20:59:59.000Z'))).toBe(
    '1 day left',
  )
  expect(coverageText(start, end, at('2026-12-30T21:00:00.000Z'))).toBe(
    'Last day of cover',
  )
  expect(coverageText(start, end, at('2026-12-31T21:00:00.000Z'))).toBe(
    'Ended 31 Dec 2026',
  )
  expect(coverageText(start, end, at('2026-09-30T21:00:00.000Z'))).toBe(
    '91 days left',
  )
})

test('progress counts whole cover days and stays between 0 and 1', () => {
  expect(coverageProgress(start, end, at('2026-09-01T00:00:00.000Z'))).toBe(0)
  expect(coverageProgress(start, end, at('2027-02-01T00:00:00.000Z'))).toBe(1)
  expect(coverageProgress(start, end, at('2026-12-31T10:00:00.000Z'))).toBe(1)
  expect(
    coverageProgress(start, end, at('2026-10-01T10:00:00.000Z')),
  ).toBeCloseTo(1 / 92)
  const day = '2026-11-10T00:00:00.000Z'
  expect(coverageProgress(day, day, at('2026-11-10T10:00:00.000Z'))).toBe(1)
  expect(coverageProgress(day, day, at('2026-11-09T10:00:00.000Z'))).toBe(0)
})

test('the bar is a progressbar with values, text and the stored dates', () => {
  render(
    <CoverageBar
      start={start}
      end={end}
      today={at('2026-12-21T00:00:00.000Z')}
    />,
  )
  const bar = screen.getByRole('progressbar', { name: 'Cover period' })
  expect(bar).toHaveAttribute('aria-valuemin', '0')
  expect(bar).toHaveAttribute('aria-valuemax', '100')
  expect(bar).toHaveAttribute('aria-valuenow', '89')
  expect(screen.getByText('10 days left')).toBeInTheDocument()
  expect(screen.getByText('1 Oct 2026')).toBeInTheDocument()
  expect(screen.getByText('31 Dec 2026')).toBeInTheDocument()
})
