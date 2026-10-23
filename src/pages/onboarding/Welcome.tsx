import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Icon } from '@/src/components/common/Icons'
import {
  HeroFarm,
  PhonePay,
  SatelliteScene,
} from '@/src/components/common/Illustrations'
import { t } from '@/src/i18n'
import styles from '@/src/pages/pages.module.css'

const SLIDES = [
  {
    art: HeroFarm,
    title: t('welcome.slide1.title'),
    body: t('welcome.slide1.body'),
  },
  {
    art: SatelliteScene,
    title: t('welcome.slide2.title'),
    body: t('welcome.slide2.body'),
  },
  {
    art: PhonePay,
    title: t('welcome.slide3.title'),
    body: t('welcome.slide3.body'),
  },
]

export default function Welcome() {
  const navigate = useNavigate()
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const onScroll = () => {
    const el = track.current
    if (!el || el.clientWidth === 0) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  const goTo = (i: number) => {
    const el = track.current
    el?.scrollTo?.({ left: i * el.clientWidth, behavior: 'smooth' })
    setIndex(i)
  }

  return (
    <div className={`screen ${styles.welcome}`}>
      <div className={styles.brand}>
        <Icon name='shield' size={30} />
        {t('app.name')}
      </div>
      <p className='muted' style={{ margin: '0 var(--sp-4)' }}>
        {t('welcome.tagline')}
      </p>
      <main className={styles.slides} ref={track} onScroll={onScroll}>
        {SLIDES.map(({ art: Art, title, body }, i) => (
          <section
            key={title}
            className={styles.slide}
            aria-label={t('welcome.slideOf', {
              n: i + 1,
              total: SLIDES.length,
            })}
          >
            <div className={styles.slideArt}>
              <Art />
            </div>
            <h2 className='h1'>{title}</h2>
            <p
              style={{
                margin: 0,
                fontSize: 'var(--fs-lg)',
                color: 'var(--ink-2)',
              }}
            >
              {body}
            </p>
          </section>
        ))}
      </main>
      <div className={styles.dots}>
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            type='button'
            className={styles.dotBtn}
            aria-label={t('welcome.slideOf', {
              n: i + 1,
              total: SLIDES.length,
            })}
            aria-current={i === index}
            onClick={() => goTo(i)}
          >
            <span />
          </button>
        ))}
      </div>
      <div className='screen-footer'>
        <Button block onClick={() => navigate('/phone-entry')}>
          {t('welcome.start')}
        </Button>
        <Button
          block
          variant='secondary'
          onClick={() => navigate('/policy-lookup')}
        >
          {t('welcome.haveAccount')}
        </Button>
      </div>
    </div>
  )
}
