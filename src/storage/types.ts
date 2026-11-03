import type { AppData, Entry, Habit, NaDay, Settings } from '../types'
import type { ISODate } from '../lib/dates'

/**
 * Tutto l'accesso ai dati passa da qui. In Fase 1 l'implementazione usa
 * localStorage; in Fase 2 basterà fornire un adapter Supabase con la stessa
 * interfaccia. I metodi sono asincroni e granulari apposta.
 */
export interface StorageAdapter {
  /** `null` al primo avvio (nessun dato salvato) */
  load(): Promise<AppData | null>
  saveHabits(habits: Habit[]): Promise<void>
  deleteHabit(habitId: string): Promise<void>
  saveEntry(entry: Entry): Promise<void>
  deleteEntry(habitId: string, date: ISODate): Promise<void>
  saveNaDay(day: NaDay): Promise<void>
  deleteNaDay(date: ISODate): Promise<void>
  saveSettings(settings: Settings): Promise<void>
  /** Sostituisce tutti i dati (import, reset) */
  replaceAll(data: AppData): Promise<void>
}
