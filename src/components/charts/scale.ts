export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export function linearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain
  const [r0, r1] = range
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0)
  return (v: number) => r0 + (v - d0) * k
}

export function niceStep(rough: number): number {
  if (rough <= 0) return 1
  const pow = 10 ** Math.floor(Math.log10(rough))
  const f = rough / pow
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow
}

export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min]
  const step = niceStep((max - min) / count)
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = start; v <= end + step / 1000; v += step)
    ticks.push(Number(v.toFixed(10)))
  return ticks
}

export function extent(values: number[], padPct = 0): [number, number] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return [min - 1, max + 1]
  const pad = (max - min) * padPct
  return [min - pad, max + pad]
}

/** Angle 0 points up (12 o'clock) and grows clockwise. */
export function polar(
  cx: number,
  cy: number,
  r: number,
  angle: number,
): [number, number] {
  return [cx + r * Math.sin(angle), cy - r * Math.cos(angle)]
}

export function arcPath(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
): string {
  const [x0, y0] = polar(cx, cy, r, a0)
  const [x1, y1] = polar(cx, cy, r, a1)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

export function svgId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '')
}
