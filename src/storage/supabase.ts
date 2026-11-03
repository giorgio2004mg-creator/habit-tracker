import type { SupabaseClient } from '@supabase/supabase-js'
import { type AppData, type Entry, type Habit, entryKey } from '../types'
import type { StorageAdapter } from './types'
import { migrate } from './backup'

/** Righe delle tabelle (vedi supabase/migrations) */
export interface HabitRow {
  user_id: string
  id: string
  name: string
  category: string
  color: string
  icon: string
  type: Habit['type']
  frequency: Habit['frequency']
  target: number | null
  unit: string | null
  step: number | null
  archived: boolean
  sort_order: number
  start_date: string
}

export interface EntryRow {
  user_id: string
  habit_id: string
  date: string
  na: boolean
  data: Entry['data'] | null
  updated_at: string
}

const num = (v: number | string | null) => (v === null ? undefined : Number(v))

export const habitToRow = (h: Habit, userId: string): HabitRow => ({
  user_id: userId,
  id: h.id,
  name: h.name,
  category: h.category,
  color: h.color,
  icon: h.icon,
  type: h.type,
  frequency: h.frequency,
  target: h.target ?? null,
  unit: h.unit ?? null,
  step: h.step ?? null,
  archived: h.archived,
  sort_order: h.order,
  start_date: h.createdAt,
})

export const rowToHabit = (r: HabitRow): Habit => ({
  id: r.id,
  name: r.name,
  category: r.category,
  color: r.color,
  icon: r.icon,
  type: r.type,
  frequency: r.frequency,
  target: num(r.target),
  unit: r.unit ?? undefined,
  step: num(r.step),
  archived: r.archived,
  order: r.sort_order,
  createdAt: r.start_date,
})

export const entryToRow = (e: Entry, userId: string): EntryRow => ({
  user_id: userId,
  habit_id: e.habitId,
  date: e.date,
  na: !!e.na,
  data: e.data ?? null,
  updated_at: e.updatedAt || new Date().toISOString(),
})

export const rowToEntry = (r: EntryRow): Entry => ({
  habitId: r.habit_id,
  date: r.date,
  na: r.na || undefined,
  data: r.data ?? undefined,
  updatedAt: r.updated_at,
})

const PAGE = 1000

function check<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error
  return data
}

/** Dati sincronizzati sull'account Supabase dell'utente. */
export function createSupabaseAdapter(client: SupabaseClient, userId: string): StorageAdapter {
  /** PostgREST restituisce al massimo 1000 righe per richiesta */
  async function selectAll<T>(table: string, orderBy: string[]): Promise<T[]> {
    const rows: T[] = []
    for (let from = 0; ; from += PAGE) {
      let query = client.from(table).select('*')
      for (const col of orderBy) query = query.order(col)
      const page = check(await query.range(from, from + PAGE - 1)) as T[]
      rows.push(...page)
      if (page.length < PAGE) return rows
    }
  }

  async function insertChunks(table: string, rows: object[]) {
    for (let i = 0; i < rows.length; i += 500) {
      check(await client.from(table).insert(rows.slice(i, i + 500)))
    }
  }

  return {
    async load() {
      const [habits, entries, naDays, settings] = await Promise.all([
        selectAll<HabitRow>('habits', ['id']),
        selectAll<EntryRow>('entries', ['habit_id', 'date']),
        selectAll<{ date: string; note: string | null }>('na_days', ['date']),
        client.from('settings').select('theme').maybeSingle().then(check),
      ])
      if (habits.length === 0 && !settings) return null

      return migrate({
        version: 1,
        habits: habits.map(rowToHabit),
        entries: Object.fromEntries(entries.map((r) => [entryKey(r.habit_id, r.date), rowToEntry(r)])),
        naDays: Object.fromEntries(naDays.map((d) => [d.date, { date: d.date, note: d.note ?? undefined }])),
        settings: { theme: settings?.theme ?? 'system' },
      })
    },

    async saveHabits(habits) {
      check(await client.from('habits').upsert(habits.map((h) => habitToRow(h, userId))))
    },

    async deleteHabit(habitId) {
      // Le registrazioni vengono cancellate a cascata
      check(await client.from('habits').delete().eq('user_id', userId).eq('id', habitId))
    },

    async saveEntry(entry) {
      check(await client.from('entries').upsert(entryToRow(entry, userId)))
    },

    async deleteEntry(habitId, date) {
      check(await client.from('entries').delete().eq('user_id', userId).eq('habit_id', habitId).eq('date', date))
    },

    async saveNaDay(day) {
      check(await client.from('na_days').upsert({ user_id: userId, date: day.date, note: day.note ?? null }))
    },

    async deleteNaDay(date) {
      check(await client.from('na_days').delete().eq('user_id', userId).eq('date', date))
    },

    async saveSettings(settings) {
      check(await client.from('settings').upsert({ user_id: userId, theme: settings.theme }))
    },

    async replaceAll(data: AppData) {
      check(await client.from('habits').delete().eq('user_id', userId))
      check(await client.from('na_days').delete().eq('user_id', userId))
      await insertChunks('habits', data.habits.map((h) => habitToRow(h, userId)))
      await insertChunks('entries', Object.values(data.entries).map((e) => entryToRow(e, userId)))
      await insertChunks(
        'na_days',
        Object.values(data.naDays).map((d) => ({ user_id: userId, date: d.date, note: d.note ?? null })),
      )
      check(await client.from('settings').upsert({ user_id: userId, theme: data.settings.theme }))
    },
  }
}
