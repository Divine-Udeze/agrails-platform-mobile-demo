import { en, type StringKey } from './en'

export type { StringKey }

export function t(
  key: StringKey,
  vars?: Record<string, string | number>,
): string {
  const template: string = en[key] ?? key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}
