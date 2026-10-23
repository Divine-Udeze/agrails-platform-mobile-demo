import { Component, type ReactNode } from 'react'
import { Button } from '@/src/components/common/Button'
import { ErrorState } from '@/src/components/common/ErrorStates'
import { AUTH_KEY, STATE_KEY } from '@/src/context/persistence'
import { t } from '@/src/i18n'

interface Props {
  children: ReactNode
  /** reloads the app; replaceable in tests (jsdom cannot navigate) */
  reload?: () => void
}

/** Wipes saved data (it may be what crashed the app) and reloads from the start. */
export function startAgain(reload: () => void) {
  try {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(STATE_KEY)
  } catch {
    // Storage blocked: reloading is still the best we can do.
  }
  reload()
}

/** Catches a crash anywhere below it and offers a way back instead of a blank screen. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    const reload = this.props.reload ?? (() => window.location.assign('/'))
    return (
      <div className='screen'>
        <main className='screen-body'>
          <ErrorState
            kind='generic'
            action={
              <Button block onClick={() => startAgain(reload)}>
                {t('error.startAgain')}
              </Button>
            }
          />
        </main>
      </div>
    )
  }
}
