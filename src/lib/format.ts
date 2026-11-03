const numberFmt = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 })
const oneDecimal = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 })

export const formatNumber = (n: number) => numberFmt.format(n)
export const formatOneDecimal = (n: number) => oneDecimal.format(n)

/** 465 → "7 h 45 min" */
export function formatMinutes(total: number): string {
  const m = Math.round(total)
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (h === 0) return `${rest} min`
  if (rest === 0) return `${h} h`
  return `${h} h ${rest} min`
}

export const formatPercent = (ratio: number) => `${Math.round(ratio * 100)}%`

/** "lunedì 3 novembre" → "Lunedì 3 novembre" */
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
