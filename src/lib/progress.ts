import { type AppData, type Entry, type EntryData, type Habit, MEAL_SLOTS, entryKey } from '../types'
import type { ISODate } from './dates'
import { isScheduledOn } from './schedule'
import { sleepMinutes } from './sleep'

const EPSILON = 1e-9

/** Valore principale registrato: litri, minuti, ore di sonno, pasti fatti, 1/0. */
export function amountOf(data?: EntryData): number {
  if (!data) return 0
  switch (data.type) {
    case 'check':
      return data.done ? 1 : 0
    case 'quantita':
      return data.value
    case 'durata':
      return data.minutes
    case 'sonno':
      return (sleepMinutes(data.bedtime, data.wake) ?? 0) / 60
    case 'pasti':
      return MEAL_SLOTS.filter((s) => data.meals[s]?.status === 'fatto').length
  }
}

/** Avanzamento verso l'obiettivo del giorno, tra 0 e 1. */
export function progressOf(habit: Habit, data?: EntryData): number {
  if (!data) return 0
  const amount = amountOf(data)
  switch (data.type) {
    case 'check':
      return amount
    case 'durata':
      if (!habit.target) return amount > 0 ? 1 : 0
      return Math.min(1, amount / habit.target)
    case 'pasti':
      return Math.min(1, amount / (habit.target ?? MEAL_SLOTS.length))
    default:
      return Math.min(1, amount / (habit.target || 1))
  }
}

export function isCompleted(habit: Habit, data?: EntryData): boolean {
  return progressOf(habit, data) >= 1 - EPSILON
}

/** C'è qualcosa di registrato (anche un pasto saltato o solo l'ora a letto)? */
export function hasData(data?: EntryData): boolean {
  if (!data) return false
  switch (data.type) {
    case 'check':
      return data.done || !!data.note
    case 'quantita':
      return data.value > 0
    case 'durata':
      return data.minutes > 0 || !!data.topic
    case 'sonno':
      return !!data.bedtime || !!data.wake
    case 'pasti':
      return Object.keys(data.meals).length > 0
  }
}

export function getEntry(app: AppData, habitId: string, date: ISODate): Entry | undefined {
  return app.entries[entryKey(habitId, date)]
}

/** Il giorno non conta: non applicabile per tutte le abitudini o solo per questa. */
export function isNa(app: AppData, habit: Habit, date: ISODate): boolean {
  return !!app.naDays[date] || !!getEntry(app, habit.id, date)?.na
}

export function isCompletedOn(app: AppData, habit: Habit, date: ISODate): boolean {
  const entry = getEntry(app, habit.id, date)
  return !entry?.na && isCompleted(habit, entry?.data)
}

export type DayStatus =
  | 'done' // obiettivo raggiunto
  | 'partial' // qualcosa registrato, obiettivo non raggiunto
  | 'missed' // giorno passato previsto e senza dati
  | 'na' // non applicabile
  | 'empty' // nessun dato e non (ancora) un mancato: futuro, oggi, giorno libero

export function dayStatus(app: AppData, habit: Habit, date: ISODate, today: ISODate): DayStatus {
  if (isNa(app, habit, date)) return 'na'
  const data = getEntry(app, habit.id, date)?.data
  if (isCompleted(habit, data)) return 'done'
  if (hasData(data)) return 'partial'
  const countsAsMissed =
    date < today &&
    date >= habit.createdAt &&
    habit.frequency.kind !== 'weekly' &&
    isScheduledOn(habit, date)
  return countsAsMissed ? 'missed' : 'empty'
}
