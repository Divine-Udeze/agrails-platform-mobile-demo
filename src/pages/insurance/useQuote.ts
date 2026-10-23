import { useEffect, useRef, useState } from 'react'
import { PLAN_LIST, RECOMMENDED_PLAN } from '@/src/data/cropConfig'
import { getQuote } from '@/src/services/policyService'
import type { Farm, PlanId, Quote } from '@/src/types'

export function planFromSearch(search: URLSearchParams): PlanId {
  const plan = search.get('plan')
  return PLAN_LIST.includes(plan as PlanId)
    ? (plan as PlanId)
    : RECOMMENDED_PLAN
}

interface Settled {
  key: string
  quotes: Quote[] | null
  error: boolean
}

export function useQuotes(farm: Farm | undefined, planIds: PlanId[]) {
  const [settled, setSettled] = useState<Settled | null>(null)
  const [attempt, setAttempt] = useState(0)
  const key = farm
    ? `${farm.id}:${farm.crop}:${farm.season}:${farm.areaHa}:${farm.riskLevel}:${planIds.join(',')}:${attempt}`
    : ''
  // the fetch effect depends on the key alone and reads the latest inputs here
  const inputs = useRef({ farm, planIds })
  useEffect(() => {
    inputs.current = { farm, planIds }
  })
  useEffect(() => {
    setSettled(null)
    const { farm: f, planIds: ids } = inputs.current
    if (!f) return
    let live = true
    Promise.all(ids.map((p) => getQuote(f, p)))
      .then((quotes) => {
        if (live) setSettled({ key, quotes, error: false })
      })
      .catch(() => {
        if (live) setSettled({ key, quotes: null, error: true })
      })
    return () => {
      live = false
    }
  }, [key])
  // a result only counts for the key it was fetched for, so quotes for another
  // plan or farm are never shown while the new ones load
  const current = settled?.key === key ? settled : null
  return {
    quotes: current?.quotes ?? null,
    error: current?.error ?? false,
    retry: () => setAttempt((n) => n + 1),
  }
}
