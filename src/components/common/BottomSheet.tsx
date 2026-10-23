import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import styles from '@/src/components/common/common.module.css'
import { Icon } from '@/src/components/common/Icons'
import { t } from '@/src/i18n'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Skip elements a user cannot reach: hidden, inert, or inside/at display:none. */
function isTabbable(el: HTMLElement, root: HTMLElement) {
  if (el.closest('[hidden],[inert]')) return false
  // Walk up to the sheet: display:none on any ancestor hides the whole subtree.
  for (let n: HTMLElement | null = el; n; n = n.parentElement) {
    if (getComputedStyle(n).display === 'none') return false
    if (n === root) break
  }
  return getComputedStyle(el).visibility !== 'hidden'
}

/** Open sheets, topmost last: Escape closes only the topmost one. */
const openSheets: symbol[] = []

export function BottomSheet({ open, onClose, title, children }: Props) {
  const dialog = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Escape closes; focus moves into the sheet and returns to the opener on close.
  useEffect(() => {
    if (!open) return
    const id = Symbol('sheet')
    openSheets.push(id)
    const opener = document.activeElement as HTMLElement | null
    const node = dialog.current
    if (node && !node.contains(document.activeElement)) node.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (openSheets[openSheets.length - 1] !== id) return
      e.preventDefault()
      onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      openSheets.splice(openSheets.indexOf(id), 1)
      if (opener && opener.isConnected) opener.focus()
    }
  }, [open])

  // Keep Tab and Shift+Tab cycling inside the sheet.
  const trapTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const node = e.currentTarget
    const items = Array.from(
      node.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((el) => isTabbable(el, node))
    if (items.length === 0) {
      e.preventDefault()
      node.focus()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === node)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  if (!open) return null
  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div
        ref={dialog}
        tabIndex={-1}
        onKeyDown={trapTab}
        className={styles.sheet}
        role='dialog'
        aria-modal='true'
        aria-label={title}
      >
        <div className='row-between'>
          <h2 className='h3'>{title}</h2>
          <button
            type='button'
            className={styles.iconBtn}
            aria-label={t('common.close')}
            onClick={onClose}
          >
            <Icon name='close' />
          </button>
        </div>
        <div style={{ marginTop: 'var(--sp-3)' }}>{children}</div>
      </div>
    </>
  )
}
