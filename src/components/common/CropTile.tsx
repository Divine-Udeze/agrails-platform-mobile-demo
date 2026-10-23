import styles from '@/src/components/common/common.module.css'
import type { Crop, Status } from '@/src/types'

interface Props {
  crop: Crop
  status?: Status
  size?: number
  /** omit to make the tile decorative */
  label?: string
}

const G = '#2f9e5a'
const GD = '#1f6b3a'
const GOLD = '#e0a526'
const SOIL = '#96643a'
const CREAM = '#f4e3b5'

function Maize() {
  const rows = [22, 28, 34, 40, 46]
  return (
    <>
      <path
        d='M32 58 C30 50 30 44 32 38'
        stroke={GD}
        strokeWidth='3'
        fill='none'
        strokeLinecap='round'
      />
      <path d='M32 52 C20 50 12 40 10 26 C20 30 28 38 32 52Z' fill={G} />
      <path d='M32 52 C44 50 52 40 54 26 C44 30 36 38 32 52Z' fill={GD} />
      <ellipse cx='32' cy='33' rx='9' ry='17' fill={GOLD} />
      {rows.map((y) => (
        <g key={y} fill={CREAM}>
          <circle cx='28' cy={y - 6} r='1.8' />
          <circle cx='32' cy={y - 6} r='1.8' />
          <circle cx='36' cy={y - 6} r='1.8' />
        </g>
      ))}
      <path
        d='M32 52 C24 46 23 34 26 22 C28 34 30 42 32 52Z'
        fill={G}
        opacity='0.9'
      />
      <path
        d='M32 52 C40 46 41 34 38 22 C36 34 34 42 32 52Z'
        fill={GD}
        opacity='0.9'
      />
      <path
        d='M32 17 C30 11 28 9 26 7 M32 17 C32 10 32 8 32 5 M32 17 C34 11 36 9 38 7'
        stroke={SOIL}
        strokeWidth='1.8'
        fill='none'
        strokeLinecap='round'
      />
    </>
  )
}

function Beans() {
  return (
    <>
      <path d='M10 18 C26 10 44 20 54 38 C40 34 24 30 10 18Z' fill={G} />
      <circle cx='22' cy='20' r='3' fill={GD} />
      <circle cx='32' cy='24' r='3' fill={GD} />
      <circle cx='43' cy='31' r='3' fill={GD} />
      <path d='M8 36 C24 30 44 42 54 56 C38 54 20 50 8 36Z' fill={GD} />
      <path d='M12 40 C26 38 42 46 50 54 C38 52 24 48 12 40Z' fill={CREAM} />
      <circle cx='22' cy='43' r='4' fill={SOIL} />
      <circle cx='31' cy='46' r='4' fill={SOIL} />
      <circle cx='40' cy='50' r='4' fill={SOIL} />
      <path d='M6 50 C14 46 22 52 28 60 C18 60 10 56 6 50Z' fill={G} />
      <circle cx='15' cy='53' r='2.4' fill={GD} />
    </>
  )
}

function Tea() {
  return (
    <>
      <path
        d='M32 60 C32 48 32 38 32 26'
        stroke={SOIL}
        strokeWidth='3'
        fill='none'
        strokeLinecap='round'
      />
      <path d='M32 26 C24 20 24 10 32 4 C40 10 40 20 32 26Z' fill={G} />
      <path d='M32 40 C20 38 12 30 12 20 C24 20 32 28 32 40Z' fill={GD} />
      <path d='M32 40 C44 38 52 30 52 20 C40 20 32 28 32 40Z' fill={G} />
      <path d='M32 54 C22 54 16 48 14 40 C24 40 30 46 32 54Z' fill={G} />
      <path d='M32 54 C42 54 48 48 50 40 C40 40 34 46 32 54Z' fill={GD} />
      <g stroke={CREAM} strokeWidth='1.4' fill='none' strokeLinecap='round'>
        <path d='M32 24 L32 9' />
        <path d='M32 38 L16 22' />
        <path d='M32 38 L48 22' />
        <path d='M32 52 L18 42' />
        <path d='M32 52 L46 42' />
      </g>
    </>
  )
}

const ART = { maize: Maize, beans: Beans, tea: Tea }

/** Health-tinted tile with a hand-drawn crop illustration. */
export function CropTile({ crop, status = 'good', size = 64, label }: Props) {
  const Art = ART[crop]
  return (
    <div
      className={styles.cropTile}
      data-crop={crop}
      data-status={status}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
    >
      <svg viewBox='0 0 64 64' width='100%' height='100%' aria-hidden='true'>
        <Art />
      </svg>
    </div>
  )
}
