import { type AppData, entryKey } from '../types'
import type { StorageAdapter } from './types'
import { migrate } from './backup'

export const STORAGE_KEY = 'habit-tracker:v1'

/** Salva l'intero stato come un unico JSON in localStorage. */
export function createLocalStorageAdapter(key = STORAGE_KEY): StorageAdapter {
  const read = (): AppData | null => {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return migrate(JSON.parse(raw))
  }

  const write = (data: AppData) => localStorage.setItem(key, JSON.stringify(data))

  const update = async (fn: (data: AppData) => void) => {
    const data = read()
    if (!data) throw new Error('Dati non inizializzati')
    fn(data)
    write(data)
  }

  return {
    load: async () => read(),
    saveHabits: (habits) =>
      update((data) => {
        for (const h of habits) {
          const i = data.habits.findIndex((x) => x.id === h.id)
          if (i >= 0) data.habits[i] = h
          else data.habits.push(h)
        }
      }),
    deleteHabit: (habitId) =>
      update((data) => {
        data.habits = data.habits.filter((h) => h.id !== habitId)
        for (const [k, e] of Object.entries(data.entries)) {
          if (e.habitId === habitId) delete data.entries[k]
        }
      }),
    saveEntry: (entry) =>
      update((data) => {
        data.entries[entryKey(entry.habitId, entry.date)] = entry
      }),
    deleteEntry: (habitId, date) =>
      update((data) => {
        delete data.entries[entryKey(habitId, date)]
      }),
    saveNaDay: (day) =>
      update((data) => {
        data.naDays[day.date] = day
      }),
    deleteNaDay: (date) =>
      update((data) => {
        delete data.naDays[date]
      }),
    saveSettings: (settings) =>
      update((data) => {
        data.settings = settings
      }),
    replaceAll: async (data) => write(data),
  }
}
