import type { AppData, Habit } from '../types'
import type { ISODate } from '../lib/dates'
import { newId } from '../lib/id'

type HabitSeed = Omit<Habit, 'id' | 'order' | 'archived' | 'createdAt'>

const DEFAULT_HABITS: HabitSeed[] = [
  {
    name: 'Acqua',
    category: 'Salute',
    color: '#3b82f6',
    icon: '💧',
    type: 'quantita',
    frequency: { kind: 'daily' },
    target: 2,
    unit: 'L',
    step: 0.25,
  },
  {
    name: 'Palestra',
    category: 'Sport',
    color: '#ef4444',
    icon: '🏋️',
    type: 'check',
    frequency: { kind: 'weekly', times: 3 },
  },
  {
    name: 'Studio',
    category: 'Crescita',
    color: '#8b5cf6',
    icon: '📚',
    type: 'durata',
    frequency: { kind: 'daily' },
  },
  {
    name: 'Sonno',
    category: 'Salute',
    color: '#6366f1',
    icon: '😴',
    type: 'sonno',
    frequency: { kind: 'daily' },
    target: 8,
  },
  {
    name: 'Alimentazione',
    category: 'Salute',
    color: '#f59e0b',
    icon: '🍽️',
    type: 'pasti',
    frequency: { kind: 'daily' },
    target: 4,
  },
]

export function createInitialData(today: ISODate): AppData {
  return {
    version: 1,
    habits: DEFAULT_HABITS.map((h, i) => ({ ...h, id: newId(), order: i, archived: false, createdAt: today })),
    entries: {},
    naDays: {},
    settings: { theme: 'system' },
  }
}
