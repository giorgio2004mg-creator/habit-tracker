import type { AppData, Entry, Habit, HabitType } from '../types'
import { todayISO } from '../lib/dates'

const HABIT_TYPES: HabitType[] = ['check', 'quantita', 'durata', 'sonno', 'pasti']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function isHabit(v: unknown): v is Habit {
  if (!isObject(v)) return false
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.type === 'string' &&
    HABIT_TYPES.includes(v.type as HabitType) &&
    isObject(v.frequency) &&
    ['daily', 'weekdays', 'weekly'].includes(v.frequency.kind as string)
  )
}

function isEntry(v: unknown): v is Entry {
  return (
    isObject(v) &&
    typeof v.habitId === 'string' &&
    typeof v.date === 'string' &&
    DATE_RE.test(v.date) &&
    (v.data === undefined || (isObject(v.data) && HABIT_TYPES.includes(v.data.type as HabitType)))
  )
}

export class InvalidBackupError extends Error {}

/**
 * Verifica un JSON (da localStorage o da un file di backup) e lo porta alla
 * versione corrente, completando i campi mancanti.
 */
export function migrate(raw: unknown): AppData {
  if (!isObject(raw)) throw new InvalidBackupError('Il file non contiene dati validi.')
  if (raw.version !== 1) throw new InvalidBackupError('Versione dei dati non supportata.')
  if (!Array.isArray(raw.habits) || !raw.habits.every(isHabit)) {
    throw new InvalidBackupError('Elenco delle abitudini non valido.')
  }
  const entries = isObject(raw.entries) ? raw.entries : {}
  if (!Object.values(entries).every(isEntry)) {
    throw new InvalidBackupError('Registrazioni non valide.')
  }

  const habits = (raw.habits as Habit[]).map((h, i) => ({
    ...h,
    category: h.category ?? '',
    color: h.color ?? '#10b981',
    icon: h.icon ?? '✅',
    archived: !!h.archived,
    order: typeof h.order === 'number' ? h.order : i,
    createdAt: typeof h.createdAt === 'string' && DATE_RE.test(h.createdAt) ? h.createdAt : todayISO(),
  }))
  const settings = isObject(raw.settings) ? raw.settings : {}

  return {
    version: 1,
    habits,
    entries: entries as AppData['entries'],
    naDays: (isObject(raw.naDays) ? raw.naDays : {}) as AppData['naDays'],
    settings: {
      theme: settings.theme === 'light' || settings.theme === 'dark' ? settings.theme : 'system',
    },
  }
}

export function exportJson(data: AppData): string {
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2)
}

export function parseBackup(text: string): AppData {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new InvalidBackupError('Il file non è un JSON valido.')
  }
  return migrate(raw)
}
