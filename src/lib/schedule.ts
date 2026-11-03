import type { Frequency, Habit } from '../types'
import { type ISODate, WEEKDAY_SHORT, weekday } from './dates'

/**
 * L'abitudine è prevista in questo giorno?
 * Per le abitudini "X volte a settimana" ogni giorno è valido.
 */
export function isScheduledOn(habit: Habit, date: ISODate): boolean {
  const f = habit.frequency
  if (f.kind === 'weekdays') return f.days.includes(weekday(date))
  return true
}

export function frequencyLabel(f: Frequency): string {
  switch (f.kind) {
    case 'daily':
      return 'Ogni giorno'
    case 'weekdays':
      return f.days.length === 7
        ? 'Ogni giorno'
        : [...f.days].sort().map((d) => WEEKDAY_SHORT[d]).join(' · ')
    case 'weekly':
      return `${f.times} ${f.times === 1 ? 'volta' : 'volte'} a settimana`
  }
}
