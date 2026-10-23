import type { FarmFormData } from '@/src/types'

/** Where to send the farmer if the add-farm details are incomplete (e.g. after a reload). */
export function requiredFormStep(form: FarmFormData): string | null {
  if (!form.name.trim() || !form.crop || !form.season || !form.plantingDate)
    return '/add-farm'
  return null
}
