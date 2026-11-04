import { type AppData, type EntryData, type Habit, MEAL_SLOTS, type MealLog, entryKey } from '../types'
import { type ISODate, addDays, weekday } from '../lib/dates'
import { createInitialData } from './seed'

/** Generatore pseudo-casuale con seme: la demo è uguale a ogni apertura. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FOODS: Record<(typeof MEAL_SLOTS)[number], string[]> = {
  colazione: ['Yogurt greco e frutta', 'Latte e biscotti', 'Pane e marmellata', 'Porridge con banana'],
  pranzo: ['Pasta al pomodoro', 'Riso con pollo e verdure', 'Insalata di farro', 'Piadina e insalata'],
  merenda: ['Frutta secca', 'Una mela', 'Yogurt', 'Barretta proteica'],
  cena: ['Salmone e patate', 'Pizza', 'Petto di pollo e verdure', 'Minestrone e pane'],
}
const TOPICS = ['Claude Code', 'React', 'TypeScript', 'Inglese']

const time = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Cinque settimane di dati verosimili, che finiscono oggi. */
export function createDemoData(today: ISODate, days = 35): AppData {
  const rand = mulberry32(42)
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)]
  const start = addDays(today, -days)
  const app = createInitialData(start)
  const byType = (type: Habit['type']) => app.habits.find((h) => h.type === type)!

  const put = (habit: Habit, date: ISODate, data: EntryData) => {
    app.entries[entryKey(habit.id, date)] = { habitId: habit.id, date, data, updatedAt: `${date}T20:00:00.000Z` }
  }

  const vacation = addDays(today, -16)
  app.naDays[vacation] = { date: vacation, note: 'Vacanza' }

  for (let d = start; d < today; d = addDays(d, 1)) {
    if (d === vacation) continue
    put(byType('quantita'), d, { type: 'quantita', value: Math.round((1.5 + rand() * 1.0) * 4) / 4 })

    // Palestra lun-mer-ven, ogni tanto saltata
    if ([0, 2, 4].includes(weekday(d)) && rand() < 0.85) put(byType('check'), d, { type: 'check', done: true })

    if (rand() < 0.85) {
      put(byType('durata'), d, { type: 'durata', minutes: 15 * (2 + Math.floor(rand() * 5)), topic: pick(TOPICS) })
    }

    const bed = 22 * 60 + 30 + Math.floor(rand() * 5) * 15
    const wake = 7 * 60 + Math.floor(rand() * 5) * 15
    put(byType('sonno'), d, { type: 'sonno', bedtime: time(bed), wake: time(wake) })

    const meals: Partial<Record<(typeof MEAL_SLOTS)[number], MealLog>> = {}
    for (const slot of MEAL_SLOTS) {
      const skipped = slot === 'merenda' ? rand() < 0.2 : rand() < 0.04
      meals[slot] = skipped ? { status: 'saltato' } : { status: 'fatto', food: pick(FOODS[slot]) }
    }
    put(byType('pasti'), d, { type: 'pasti', meals })
  }

  // Oggi: giornata appena iniziata
  put(byType('quantita'), today, { type: 'quantita', value: 0.75 })
  put(byType('pasti'), today, { type: 'pasti', meals: { colazione: { status: 'fatto', food: 'Yogurt greco e frutta' } } })

  return app
}
