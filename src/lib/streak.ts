import type { AppData, Habit } from '../types'
import { type ISODate, addDays, startOfWeek } from './dates'
import { isCompletedOn, isNa } from './progress'
import { isScheduledOn } from './schedule'

export interface Streak {
  current: number
  best: number
  unit: 'giorni' | 'settimane'
}

export interface WeekResult {
  /** Volte richieste, ridotte se nella settimana ci sono giorni non applicabili */
  required: number
  done: number
}

/** Esito di una settimana (lun–dom) per un'abitudine "X volte a settimana". */
export function weekResult(app: AppData, habit: Habit, weekStart: ISODate, today: ISODate): WeekResult {
  const times = habit.frequency.kind === 'weekly' ? habit.frequency.times : 7
  let available = 0
  let done = 0
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i)
    if (d < habit.createdAt || isNa(app, habit, d)) continue
    available++
    if (d <= today && isCompletedOn(app, habit, d)) done++
  }
  return { required: Math.min(times, available), done }
}

/**
 * Streak attuale e record. I giorni non applicabili vengono saltati senza
 * interrompere la serie; oggi, se non ancora completato, è "in sospeso".
 * Per le abitudini "X volte a settimana" la serie si conta in settimane.
 */
export function computeStreak(app: AppData, habit: Habit, today: ISODate): Streak {
  if (habit.frequency.kind === 'weekly') return weeklyStreak(app, habit, today)

  let run = 0
  let best = 0
  for (let d = habit.createdAt; d <= today; d = addDays(d, 1)) {
    if (!isScheduledOn(habit, d) || isNa(app, habit, d)) continue
    if (isCompletedOn(app, habit, d)) {
      run++
      best = Math.max(best, run)
    } else if (d !== today) {
      run = 0
    }
  }
  return { current: run, best, unit: 'giorni' }
}

function weeklyStreak(app: AppData, habit: Habit, today: ISODate): Streak {
  const currentWeek = startOfWeek(today)
  let run = 0
  let best = 0
  for (let w = startOfWeek(habit.createdAt); w <= currentWeek; w = addDays(w, 7)) {
    const { required, done } = weekResult(app, habit, w, today)
    if (required === 0) continue
    if (done >= required) {
      run++
      best = Math.max(best, run)
    } else if (w !== currentWeek) {
      run = 0
    }
  }
  return { current: run, best, unit: 'settimane' }
}
