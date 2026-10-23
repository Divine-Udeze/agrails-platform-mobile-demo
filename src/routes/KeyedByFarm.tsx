import { Fragment, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'

/** Remounts its page when :farmId changes, so per-farm refs never carry over. */
export function KeyedByFarm({ children }: { children: ReactNode }) {
  const { farmId } = useParams()
  return <Fragment key={farmId}>{children}</Fragment>
}
