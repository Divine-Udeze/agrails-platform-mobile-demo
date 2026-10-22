interface Props {
  className?: string
}

const base = { 'aria-hidden': true, className: undefined as string | undefined }

export function HeroFarm({ className }: Props) {
  return (
    <svg {...base} className={className} viewBox='0 0 360 240'>
      <rect width='360' height='240' fill='#e2effb' />
      <circle cx='290' cy='60' r='30' fill='#e0a526' />
      <path d='M0 150 Q90 100 180 140 T360 120 V240 H0Z' fill='#8fd3a5' />
      <path d='M0 180 Q120 140 240 175 T360 165 V240 H0Z' fill='#2f9e5a' />
      <path d='M0 210 Q140 185 360 205 V240 H0Z' fill='#96643a' />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i} transform={`translate(${30 + i * 38} ${196 - (i % 2) * 4})`}>
          <path d='M0 0 V-34' stroke='#1f6b3a' strokeWidth='3' />
          <path
            d='M0 -12 Q-12 -20 -14 -30 M0 -20 Q12 -26 14 -36 M0 -28 Q-8 -34 -8 -42'
            stroke='#1f6b3a'
            strokeWidth='3'
            fill='none'
            strokeLinecap='round'
          />
          <ellipse cx='4' cy='-24' rx='3' ry='7' fill='#e0a526' />
        </g>
      ))}
    </svg>
  )
}

export function SatelliteScene({ className }: Props) {
  return (
    <svg {...base} className={className} viewBox='0 0 200 140'>
      <rect width='200' height='140' rx='18' fill='#0f3d21' />
      {Array.from({ length: 18 }, (_, i) => (
        <circle
          key={i}
          cx={(i * 47) % 200}
          cy={(i * 29) % 70}
          r='1.2'
          fill='#fff'
          opacity='0.7'
        />
      ))}
      <g transform='translate(120 34) rotate(-25)'>
        <rect x='-26' y='-7' width='18' height='14' fill='#4a9be0' />
        <rect x='8' y='-7' width='18' height='14' fill='#4a9be0' />
        <rect x='-8' y='-9' width='16' height='18' rx='3' fill='#dfe5e1' />
      </g>
      <path
        d='M112 48 L70 112 M120 50 L130 112'
        stroke='#e0a526'
        strokeWidth='2'
        strokeDasharray='4 4'
      />
      <path d='M30 112 h140 v20 h-140z' fill='#2f9e5a' />
      <path
        d='M60 112 l20 -6 l40 4 l14 8z'
        fill='#8fd3a5'
        stroke='#e0a526'
        strokeWidth='2'
      />
    </svg>
  )
}

export function PhonePay({ className }: Props) {
  return (
    <svg {...base} className={className} viewBox='0 0 160 160'>
      <circle cx='80' cy='80' r='72' fill='#e3f5e8' />
      <rect x='52' y='28' width='56' height='104' rx='10' fill='#17201a' />
      <rect x='57' y='38' width='46' height='80' rx='4' fill='#fff' />
      <rect x='63' y='52' width='34' height='8' rx='4' fill='#2f9e5a' />
      <rect x='63' y='66' width='26' height='6' rx='3' fill='#dfe5e1' />
      <rect x='63' y='78' width='34' height='22' rx='4' fill='#e3f5e8' />
      <circle cx='118' cy='46' r='14' fill='#e0a526' />
      <text
        x='118'
        y='51'
        textAnchor='middle'
        fontSize='14'
        fontWeight='800'
        fill='#fff'
      >
        K
      </text>
    </svg>
  )
}

export function EmptyField({ className }: Props) {
  return (
    <svg {...base} className={className} viewBox='0 0 160 120'>
      <ellipse cx='80' cy='100' rx='70' ry='12' fill='#f4ece3' />
      <path d='M30 98 l50 -18 l50 18 l-50 14z' fill='#96643a' opacity='0.5' />
      <path
        d='M80 82 V40'
        stroke='#2f9e5a'
        strokeWidth='4'
        strokeLinecap='round'
      />
      <path
        d='M80 60 Q60 50 58 36 Q76 40 80 58 M80 52 Q98 40 104 28 Q84 32 80 50'
        fill='#8fd3a5'
        stroke='#2f9e5a'
        strokeWidth='2'
      />
    </svg>
  )
}

export function Celebrate({ className }: Props) {
  const colors = ['#e0a526', '#2f9e5a', '#4a9be0', '#c62828']
  return (
    <svg {...base} className={className} viewBox='0 0 200 160'>
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2
        const r = 60 + (i % 3) * 12
        return (
          <rect
            key={i}
            x={100 + Math.cos(a) * r}
            y={80 + Math.sin(a) * r * 0.7}
            width='6'
            height='10'
            rx='2'
            fill={colors[i % 4]}
            transform={`rotate(${i * 37} ${100 + Math.cos(a) * r} ${80 + Math.sin(a) * r * 0.7})`}
          />
        )
      })}
      <circle cx='100' cy='80' r='38' fill='#e0a526' />
      <circle
        cx='100'
        cy='80'
        r='30'
        fill='none'
        stroke='#fff'
        strokeWidth='3'
      />
      <text
        x='100'
        y='88'
        textAnchor='middle'
        fontSize='24'
        fontWeight='800'
        fill='#fff'
      >
        KES
      </text>
    </svg>
  )
}
