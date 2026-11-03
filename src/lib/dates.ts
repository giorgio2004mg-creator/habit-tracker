import type { Weekday } from '../types'

/** Data locale nel formato `YYYY-MM-DD`. Le stringhe si confrontano in ordine cronologico. */
export type ISODate = string

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Mezzogiorno locale: evita sorprese con il cambio dell'ora legale. */
export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function todayISO(): ISODate {
  return toISO(new Date())
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((fromISO(to).getTime() - fromISO(from).getTime()) / 86_400_000)
}

export function weekday(s: ISODate): Weekday {
  return ((fromISO(s).getDay() + 6) % 7) as Weekday
}

export function startOfWeek(s: ISODate): ISODate {
  return addDays(s, -weekday(s))
}

export function endOfWeek(s: ISODate): ISODate {
  return addDays(startOfWeek(s), 6)
}

export function startOfMonth(s: ISODate): ISODate {
  return `${s.slice(0, 7)}-01`
}

export function endOfMonth(s: ISODate): ISODate {
  const d = fromISO(s)
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12))
}

export function addMonths(s: ISODate, n: number): ISODate {
  const d = fromISO(startOfMonth(s))
  return toISO(new Date(d.getFullYear(), d.getMonth() + n, 1, 12))
}

/** Tutti i giorni tra `from` e `to` inclusi. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const days: ISODate[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d)
  return days
}

export const minDate = (a: ISODate, b: ISODate) => (a < b ? a : b)
export const maxDate = (a: ISODate, b: ISODate) => (a > b ? a : b)

export const WEEKDAY_LETTERS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
export const WEEKDAY_SHORT = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']

const longFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
const monthFmt = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' })
const shortFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })

/** "lunedì 3 novembre" */
export const formatLong = (s: ISODate) => longFmt.format(fromISO(s))
/** "novembre 2026" */
export const formatMonth = (s: ISODate) => monthFmt.format(fromISO(s))
/** "3 nov" */
export const formatShort = (s: ISODate) => shortFmt.format(fromISO(s))
