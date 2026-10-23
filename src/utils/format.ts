export const HA_TO_ACRES = 2.47105

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function formatKES(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString('en-US')}`
}

export function haToAcres(ha: number): number {
  return ha * HA_TO_ACRES
}

export function acresToHa(acres: number): number {
  return acres / HA_TO_ACRES
}

export function formatHa(ha: number): string {
  return `${Number(ha.toFixed(2))} ha`
}

export function formatAcres(ha: number): string {
  return `${Number(haToAcres(ha).toFixed(1))} acres`
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

export function formatDate(iso: string): string {
  return `${formatShortDate(iso)} ${new Date(iso).getUTCFullYear()}`
}

export function formatPhone(e164: string): string {
  const local = e164.replace(/^\+254/, '')
  return `+254 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
}

/** Formats the local part of a Kenyan number in groups as it is typed: 712 345 678 / 0712 345 678. */
export function groupLocalPhone(input: string): string {
  let d = input.replace(/\D/g, '')
  if (d.startsWith('254')) d = d.slice(3)
  d = d.slice(0, d.startsWith('0') ? 10 : 9)
  const head = d.startsWith('0') ? 4 : 3
  return [d.slice(0, head), d.slice(head, head + 3), d.slice(head + 3)]
    .filter(Boolean)
    .join(' ')
}

/** Shows only the first and last digits of a stored number: +254 7•• ••• 678. */
export function maskPhone(e164: string): string {
  const local = e164.replace(/^\+254/, '')
  return `+254 ${local[0]}•• ••• ${local.slice(-3)}`
}

/** Today's date as YYYY-MM-DD in the device's local time zone. */
export function todayISO(now: Date = new Date()): string {
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}

/** Rounds to a whole number with thousands separators: 12,500. */
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}
