import type { Crop } from '@/src/types'

const PATHS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  monitor: 'M3 12h4l3-7 4 14 3-7h4',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  payout:
    'M3 7h15a3 3 0 013 3v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 0l2-3h11M16 14h2',
  profile: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  back: 'M15 5l-7 7 7 7',
  chevron: 'M9 5l7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM8.5 12l2.5 2.5 4.5-5',
  satellite:
    'M4 10l6-6 4 4-6 6-4-4zM14 14l6-6M10 18a4 4 0 004-4M7 21a7 7 0 007-7',
  cash: 'M3 7h18v10H3zM12 15a3 3 0 100-6 3 3 0 000 6z',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  cloud: 'M7 18h10a4 4 0 000-8 6 6 0 00-11.5 1.5A3.5 3.5 0 007 18z',
  rain: 'M7 15h10a4 4 0 000-8 6 6 0 00-11.5 1.5A3.5 3.5 0 007 15zM8 21l1-3M12 21l1-3M16 21l1-3',
  drop: 'M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z',
  thermo: 'M10 14V5a2 2 0 014 0v9a4 4 0 11-4 0z',
  leaf: 'M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l7-7',
  maize:
    'M12 3c3 2 4 5 4 9s-1 7-4 9c-3-2-4-5-4-9s1-7 4-9zM12 7v12M9.5 9h5M9 12h6M9.5 15h5',
  beans:
    'M10 4a5 5 0 014 8c-1.5 2-1 4-3 6a4.5 4.5 0 01-7-5c1.5-3 1-9 6-9zM16 15a3 3 0 106 0 3 3 0 00-6 0',
  tea: 'M12 21V11M12 11C8 11 5 8 5 4c4 0 7 3 7 7zM12 14c3 0 6-2 7-6-4 0-7 2-7 6z',
  phone:
    'M7 2h10a1 1 0 011 1v18a1 1 0 01-1 1H7a1 1 0 01-1-1V3a1 1 0 011-1zM11 18h2',
  check: 'M5 12l5 5 9-10',
  alert: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.5',
  wifiOff:
    'M2 8a15 15 0 0120 0M5 12a10 10 0 0114 0M8.5 15.5a5 5 0 017 0M12 19v.5M3 3l18 18',
  gps: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3',
  pin: 'M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12zM12 11a2 2 0 100-4 2 2 0 000 4z',
  walk: 'M13 4a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM10 22l2-7 3 3v4M9 12l2-5 4 2 2 3M11 7l-3 3',
  draw: 'M3 21l3-1 12-12-2-2L4 18l-1 3zM14 6l2 2M15 21c2 0 6-1 6-4',
  tap: 'M9 11V5a2 2 0 014 0v6l4 1a2 2 0 011.5 2.3L17 21H9l-3-5a1.7 1.7 0 012.6-2L9 15',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  close: 'M6 6l12 12M18 6L6 18',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  globe:
    'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18',
  help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 3.5M12 17v.5',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
} as const

export type IconName = keyof typeof PATHS

export const CROP_ICON: Record<Crop, IconName> = {
  maize: 'maize',
  beans: 'beans',
  tea: 'tea',
}

interface Props {
  name: IconName
  size?: number
  title?: string
  className?: string
  strokeWidth?: number
}

export function Icon({
  name,
  size = 24,
  title,
  className,
  strokeWidth = 2,
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
