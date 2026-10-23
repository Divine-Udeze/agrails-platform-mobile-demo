import {
  useEffect,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'
import styles from '@/src/components/forms/forms.module.css'
import { t } from '@/src/i18n'

interface Props {
  value: string
  onChange: (v: string) => void
  length?: number
  error?: boolean
  /** change this number to replay the shake animation */
  errorKey?: number
  disabled?: boolean
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  error,
  errorKey = 0,
  disabled,
}: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  // Focus moves synchronously, before React re-renders with the new value,
  // so onFocus must read the value we just emitted rather than the prop.
  const latest = useRef(value)
  latest.current = value
  const focusAt = (i: number) =>
    refs.current[Math.max(0, Math.min(i, length - 1))]?.focus()
  const emit = (next: string) => {
    latest.current = next
    onChange(next)
  }

  // After a wrong code the row remounts; put the cursor back on the first box.
  useEffect(() => {
    if (error) refs.current[0]?.focus()
  }, [error, errorKey])

  const handleInput = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) {
      // Android keyboards may report Backspace only as an empty change.
      if (value[i]) emit(value.slice(0, i) + value.slice(i + 1))
      return
    }
    // Autofill / multi-digit keyboards: typing into a filled box yields 2 chars, keep the new one.
    if (digits.length > 1 && !(value[i] && digits.length === 2)) {
      const next = (value.slice(0, i) + digits).slice(0, length)
      emit(next)
      focusAt(next.length)
      return
    }
    const digit = digits.slice(-1)
    emit((value.slice(0, i) + digit + value.slice(i + 1)).slice(0, length))
    focusAt(i + 1)
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Backspace') return
    e.preventDefault()
    if (value[i]) {
      emit(value.slice(0, i) + value.slice(i + 1))
    } else if (i > 0) {
      emit(value.slice(0, i - 1))
      focusAt(i - 1)
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const digits = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, length)
    if (!digits) return
    emit(digits)
    focusAt(digits.length)
  }

  return (
    <div
      key={errorKey}
      className={`${styles.otpRow} ${error ? `${styles.otpError} ${styles.shake}` : ''}`}
    >
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          className={styles.otpBox}
          aria-label={t('otp.digit', { n: i + 1 })}
          inputMode='numeric'
          disabled={disabled}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          value={value[i] ?? ''}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => {
            if (i > latest.current.length) focusAt(latest.current.length)
          }}
        />
      ))}
    </div>
  )
}
