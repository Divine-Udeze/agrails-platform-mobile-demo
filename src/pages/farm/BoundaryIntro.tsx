import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Chip } from '@/src/components/common/Chip'
import { Header } from '@/src/components/common/Header'
import { Icon, type IconName } from '@/src/components/common/Icons'
import { SatelliteScene } from '@/src/components/common/Illustrations'
import { Screen } from '@/src/components/common/Screen'
import styles from '@/src/components/map/map.module.css'
import { useFarmForm } from '@/src/context/AppContext'
import { t, type StringKey } from '@/src/i18n'
import { requiredFormStep } from '@/src/pages/farm/formGuard'
import type { BoundaryMethod, FarmFormData } from '@/src/types'

const METHODS: {
  method: BoundaryMethod
  to: string
  icon: IconName
  title: StringKey
  body: StringKey
  best?: boolean
}[] = [
  {
    method: 'map',
    to: '/boundary-map',
    icon: 'tap',
    title: 'boundary.tap.title',
    body: 'boundary.tap.body',
    best: true,
  },
  {
    method: 'walk',
    to: '/boundary-walk',
    icon: 'walk',
    title: 'boundary.walk.title',
    body: 'boundary.walk.body',
  },
  {
    method: 'draw',
    to: '/boundary-draw',
    icon: 'draw',
    title: 'boundary.draw.title',
    body: 'boundary.draw.body',
  },
]

export default function BoundaryIntro() {
  const navigate = useNavigate()
  const { form, update } = useFarmForm()
  const redirect = requiredFormStep(form)
  if (redirect) return <Navigate to={redirect} replace />

  // A different method starts from a clean shape; the same method keeps its corners.
  const methodPatch = (method: BoundaryMethod): Partial<FarmFormData> =>
    form.method === method ? { method } : { method, boundary: [] }

  const choose = (method: BoundaryMethod, to: string) => {
    update(methodPatch(method))
    navigate(to)
  }

  return (
    <Screen header={<Header back='/add-farm' />}>
      <div className='stack'>
        <SatelliteScene />
        <h1 className='h1'>{t('boundary.introTitle')}</h1>
        <p className='muted' style={{ fontSize: 'var(--fs-md)', margin: 0 }}>
          {t('boundary.introBody')}
        </p>
        <div className='stack-sm'>
          {METHODS.map((m) => (
            <button
              key={m.method}
              type='button'
              className={`card card-tap ${styles.methodCard}`}
              onClick={() => choose(m.method, m.to)}
            >
              <span className={styles.methodIcon}>
                <Icon name={m.icon} size={30} />
              </span>
              <span>
                <span className='h3' style={{ display: 'block' }}>
                  {t(m.title)}
                </span>
                <span className='muted'>{t(m.body)}</span>
              </span>
              {m.best ? (
                <Chip status='good'>{t('boundary.recommended')}</Chip>
              ) : (
                <Icon name='chevron' />
              )}
            </button>
          ))}
        </div>
        <Link
          to='/boundary-quick-map'
          onClick={() => update(methodPatch('quick'))}
          className='btn btn-ghost btn-block'
        >
          <Icon name='pin' />
          {t('boundary.quick')}
        </Link>
      </div>
    </Screen>
  )
}
