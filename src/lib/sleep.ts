/** "07:15" → 435 */
export function parseTime(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/**
 * Minuti di sonno tra l'ora a letto e quella di sveglia.
 * Se la sveglia è "prima" dell'ora a letto si è passata la mezzanotte.
 */
export function sleepMinutes(bedtime?: string, wake?: string): number | null {
  if (!bedtime || !wake) return null
  const bed = parseTime(bedtime)
  const up = parseTime(wake)
  if (bed === null || up === null) return null
  let diff = up - bed
  if (diff <= 0) diff += 24 * 60
  return diff
}
