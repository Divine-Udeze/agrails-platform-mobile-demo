import type { Status } from '@/src/types'

/**
 * Colour tokens resolved to hex, for places CSS variables cannot reach
 * (Leaflet paths, SVG fills, contrast maths). Kept in step with tokens.css by a test.
 */
export const TOKEN_HEX: Record<string, string> = {
  'var(--green-700)': '#1f6b3a',
  'var(--green-500)': '#2f9e5a',
  'var(--green-300)': '#8fd3a5',
  'var(--green-100)': '#e3f5e8',
  'var(--soil-700)': '#6b4423',
  'var(--soil-500)': '#96643a',
  'var(--gold-500)': '#e0a526',
  'var(--rain-600)': '#1f6fb5',
  'var(--rain-400)': '#4a9be0',
  'var(--rain-100)': '#e2effb',
  'var(--good)': '#2f9e5a',
  'var(--warning)': '#c77700',
  'var(--danger)': '#c62828',
}

/** Highlight gold for drafts and new boundaries (--gold-500). */
export const GOLD = TOKEN_HEX['var(--gold-500)']

/** Literal status colours (--good, --warning, --danger). */
export const STATUS_COLOR: Record<Status, string> = {
  good: TOKEN_HEX['var(--good)'],
  warning: TOKEN_HEX['var(--warning)'],
  danger: TOKEN_HEX['var(--danger)'],
}
