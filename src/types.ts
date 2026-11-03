import type { ISODate } from './lib/dates'

export type HabitType = 'check' | 'quantita' | 'durata' | 'sonno' | 'pasti'

/** 0 = lunedì … 6 = domenica */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Frequency =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: Weekday[] }
  | { kind: 'weekly'; times: number }

export interface Habit {
  id: string
  name: string
  category: string
  color: string
  /** Emoji */
  icon: string
  type: HabitType
  frequency: Frequency
  /**
   * Obiettivo giornaliero, il significato dipende dal tipo:
   * quantita → nell'unità scelta, durata → minuti (facoltativo),
   * sonno → ore, pasti → numero di pasti fatti.
   */
  target?: number
  /** Solo `quantita`: unità di misura (es. "L", "bicchieri") */
  unit?: string
  /** Solo `quantita`: incremento del pulsante rapido */
  step?: number
  archived: boolean
  order: number
  /** Primo giorno da cui l'abitudine viene conteggiata nelle statistiche */
  createdAt: ISODate
}

export type MealSlot = 'colazione' | 'pranzo' | 'merenda' | 'cena'
export type Portion = 'leggero' | 'normale' | 'abbondante'

export interface MealLog {
  status: 'fatto' | 'saltato'
  food?: string
  portion?: Portion
}

export type EntryData =
  | { type: 'check'; done: boolean; note?: string }
  | { type: 'quantita'; value: number }
  | { type: 'durata'; minutes: number; topic?: string }
  | { type: 'sonno'; bedtime?: string; wake?: string }
  | { type: 'pasti'; meals: Partial<Record<MealSlot, MealLog>> }

/** Registrazione di un'abitudine in un giorno. */
export interface Entry {
  habitId: string
  date: ISODate
  /** Giorno non applicabile solo per questa abitudine */
  na?: boolean
  data?: EntryData
  updatedAt: string
}

/** Giorno non applicabile per tutte le abitudini (vacanza, malattia…) */
export interface NaDay {
  date: ISODate
  note?: string
}

export type ThemePref = 'system' | 'light' | 'dark'

export interface Settings {
  theme: ThemePref
}

export interface AppData {
  version: 1
  habits: Habit[]
  /** Chiave: `entryKey(habitId, date)` */
  entries: Record<string, Entry>
  /** Chiave: data ISO */
  naDays: Record<ISODate, NaDay>
  settings: Settings
}

export const MEAL_SLOTS: MealSlot[] = ['colazione', 'pranzo', 'merenda', 'cena']

export function entryKey(habitId: string, date: ISODate): string {
  return `${date}|${habitId}`
}
