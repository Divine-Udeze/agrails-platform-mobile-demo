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
