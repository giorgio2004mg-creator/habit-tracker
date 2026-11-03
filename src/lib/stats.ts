import type { AppData, Habit } from '../types'
import { type ISODate, addDays, eachDay, maxDate, minDate, startOfWeek } from './dates'
import { amountOf, getEntry, hasData, isCompletedOn, isNa } from './progress'
import { isScheduledOn } from './schedule'
import { weekResult } from './streak'

export interface Rate {
  done: number
  total: number
}

export const ratio = (r: Rate): number | null => (r.total === 0 ? null : r.done / r.total)

/**
 * Completamento di un'abitudine nell'intervallo [from, to].
 * - Giornaliere / giorni specifici: giorni completati su giorni previsti.
 *   Oggi conta solo se già completato (altrimenti è ancora in corso).
 * - "X volte a settimana": volte fatte (max X) su volte richieste, per ogni
 *   settimana che tocca l'intervallo. La settimana in corso non penalizza.
 * I giorni non applicabili sono esclusi.
 */
export function completionRate(app: AppData, habit: Habit, from: ISODate, to: ISODate, today: ISODate): Rate {
  const start = maxDate(from, habit.createdAt)
  const end = minDate(to, today)
  if (start > end) return { done: 0, total: 0 }

  if (habit.frequency.kind === 'weekly') {
    const currentWeek = startOfWeek(today)
    let done = 0
    let total = 0
    for (let w = startOfWeek(start); w <= end; w = addDays(w, 7)) {
      const r = weekResult(app, habit, w, today)
      const achieved = Math.min(r.done, r.required)
      done += achieved
      total += w === currentWeek && achieved < r.required ? achieved : r.required
    }
    return { done, total }
  }

  let done = 0
  let total = 0
  for (const d of eachDay(start, end)) {
    if (!isScheduledOn(habit, d) || isNa(app, habit, d)) continue
    const completed = isCompletedOn(app, habit, d)
    if (d === today && !completed) continue
    total++
    if (completed) done++
  }
  return { done, total }
}

export function overallRate(app: AppData, habits: Habit[], from: ISODate, to: ISODate, today: ISODate): Rate {
  return habits.reduce<Rate>(
    (acc, h) => {
      const r = completionRate(app, h, from, to, today)
      return { done: acc.done + r.done, total: acc.total + r.total }
    },
    { done: 0, total: 0 },
  )
}

/**
 * Quota di abitudini previste completate in un giorno (null se nessuna prevista).
 * Le abitudini "X volte a settimana" non hanno un giorno fisso e sono escluse.
 */
export function dayCompletion(app: AppData, habits: Habit[], date: ISODate): number | null {
  const due = habits.filter(
    (h) =>
      h.frequency.kind !== 'weekly' &&
      date >= h.createdAt &&
      isScheduledOn(h, date) &&
      !isNa(app, h, date),
  )
  if (due.length === 0) return null
  return due.filter((h) => isCompletedOn(app, h, date)).length / due.length
}

export interface AmountSummary {
  total: number
  average: number | null
  /** Giorni con dati registrati */
  days: number
}

/** Somma e media giornaliera (sui giorni con dati) del valore registrato. */
export function amountSummary(app: AppData, habit: Habit, from: ISODate, to: ISODate): AmountSummary {
  let total = 0
  let days = 0
  for (const d of eachDay(from, to)) {
    const entry = getEntry(app, habit.id, d)
    if (!entry || entry.na || !hasData(entry.data)) continue
    total += amountOf(entry.data)
    days++
  }
  return { total, average: days ? total / days : null, days }
}
