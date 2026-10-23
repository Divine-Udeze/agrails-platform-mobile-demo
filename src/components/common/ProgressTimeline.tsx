import styles from '@/src/components/common/common.module.css'
import { Icon } from '@/src/components/common/Icons'

export interface TimelineStep {
  key: string
  label: string
  date?: string
}

export function ProgressTimeline({
  steps,
  currentIndex,
}: {
  steps: TimelineStep[]
  currentIndex: number
}) {
  return (
    <ol className={styles.timeline}>
      {steps.map((s, i) => {
        const state =
          i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'pending'
        return (
          <li key={s.key} className={styles.step} data-state={state}>
            <span className={styles.stepDot}>
              {state === 'done' && (
                <Icon name='check' size={16} strokeWidth={3} />
              )}
            </span>
            <div>
              <div style={{ fontWeight: 700 }}>{s.label}</div>
              {s.date && <div className='muted'>{s.date}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
