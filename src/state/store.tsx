import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { type AppData, type EntryData, type Habit, type ThemePref, entryKey } from '../types'
import { type ISODate, todayISO } from '../lib/dates'
import { newId } from '../lib/id'
import { type StorageAdapter, createInitialData } from '../storage'

export type HabitDraft = Omit<Habit, 'id' | 'order' | 'archived' | 'createdAt'>

interface Store {
  data: AppData
  today: ISODate
  /** Abitudini attive, in ordine */
  habits: Habit[]
  createHabit(draft: HabitDraft): void
  updateHabit(habit: Habit): void
  setArchived(habitId: string, archived: boolean): void
  deleteHabit(habitId: string): void
  moveHabit(habitId: string, direction: -1 | 1): void
  setEntryData(habit: Habit, date: ISODate, data: EntryData | undefined): void
  setHabitNa(habit: Habit, date: ISODate, na: boolean): void
  setDayNa(date: ISODate, na: boolean, note?: string): void
  setTheme(theme: ThemePref): void
  replaceAll(data: AppData): void
  resetAll(): void
}

const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore va usato dentro <StoreProvider>')
  return store
}

const reportError = (err: unknown) => {
  console.error(err)
  alert('Non è stato possibile salvare i dati.')
}

/** Data di oggi, aggiornata quando passa la mezzanotte o si torna sull'app. */
function useToday(): ISODate {
  const [today, setToday] = useState(todayISO)
  useEffect(() => {
    const refresh = () => setToday(todayISO())
    const timer = setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return today
}

/** Al primo avvio su un account vuoto: usare i dati già presenti sul dispositivo? */
function askToImport(local: AppData): boolean {
  const entries = Object.keys(local.entries).length
  if (entries === 0) return false
  return confirm(
    `Su questo dispositivo ci sono ${local.habits.length} abitudini e ${entries} registrazioni. ` +
      'Vuoi caricarle nel tuo account? Altrimenti si parte dalle abitudini iniziali.',
  )
}

export function StoreProvider({
  storage,
  importFrom,
  children,
}: {
  storage: StorageAdapter
  /** Dati da proporre se `storage` è vuoto (es. il salvataggio locale al primo login) */
  importFrom?: StorageAdapter
  children: ReactNode
}) {
  const [data, setData] = useState<AppData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const today = useToday()

  useEffect(() => {
    let cancelled = false
    storage
      .load()
      .then(async (loaded) => {
        if (cancelled) return
        if (loaded) return setData(loaded)
        const local = importFrom ? await importFrom.load().catch(() => null) : null
        const initial = local && askToImport(local) ? local : createInitialData(todayISO())
        await storage.replaceAll(initial)
        if (!cancelled) setData(initial)
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) setLoadError(String(err?.message ?? err))
      })
    return () => {
      cancelled = true
    }
  }, [storage, importFrom])

  // Tornando sull'app si ricaricano i dati: possono essere cambiati da un altro dispositivo
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      storage
        .load()
        .then((loaded) => loaded && setData(loaded))
        .catch(console.error)
    }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [storage])

  const saveHabits = useCallback(
    (changed: Habit[]) => {
      setData((d) => d && { ...d, habits: d.habits.map((h) => changed.find((c) => c.id === h.id) ?? h) })
      storage.saveHabits(changed).catch(reportError)
    },
    [storage],
  )

  const store = useMemo<Store | null>(() => {
    if (!data) return null
    const habits = data.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order)
    const findHabit = (id: string) => data.habits.find((h) => h.id === id)

    return {
      data,
      today,
      habits,

      createHabit(draft) {
        const habit: Habit = {
          ...draft,
          id: newId(),
          archived: false,
          order: Math.max(-1, ...data.habits.map((h) => h.order)) + 1,
          createdAt: today,
        }
        setData((d) => d && { ...d, habits: [...d.habits, habit] })
        storage.saveHabits([habit]).catch(reportError)
      },

      updateHabit(habit) {
        saveHabits([habit])
      },

      setArchived(habitId, archived) {
        const h = findHabit(habitId)
        if (h) saveHabits([{ ...h, archived }])
      },

      deleteHabit(habitId) {
        setData((d) => {
          if (!d) return d
          const entries = Object.fromEntries(Object.entries(d.entries).filter(([, e]) => e.habitId !== habitId))
          return { ...d, habits: d.habits.filter((h) => h.id !== habitId), entries }
        })
        storage.deleteHabit(habitId).catch(reportError)
      },

      moveHabit(habitId, direction) {
        const i = habits.findIndex((h) => h.id === habitId)
        const j = i + direction
        if (i < 0 || j < 0 || j >= habits.length) return
        const a = habits[i]
        const b = habits[j]
        saveHabits([
          { ...a, order: b.order },
          { ...b, order: a.order },
        ])
      },

      setEntryData(habit, date, entryData) {
        const key = entryKey(habit.id, date)
        const prev = data.entries[key]
        const entry = { habitId: habit.id, date, na: prev?.na, data: entryData, updatedAt: new Date().toISOString() }
        const empty = !entry.na && !entry.data
        setData((d) => {
          if (!d) return d
          const entries = { ...d.entries }
          if (empty) delete entries[key]
          else entries[key] = entry
          return { ...d, entries }
        })
        ;(empty ? storage.deleteEntry(habit.id, date) : storage.saveEntry(entry)).catch(reportError)
        // Dati inseriti prima della creazione: l'abitudine si considera iniziata da quel giorno
        if (entryData && date < habit.createdAt) saveHabits([{ ...habit, createdAt: date }])
      },

      setHabitNa(habit, date, na) {
        const key = entryKey(habit.id, date)
        const prev = data.entries[key]
        const entry = { habitId: habit.id, date, data: prev?.data, na: na || undefined, updatedAt: new Date().toISOString() }
        const empty = !entry.na && !entry.data
        setData((d) => {
          if (!d) return d
          const entries = { ...d.entries }
          if (empty) delete entries[key]
          else entries[key] = entry
          return { ...d, entries }
        })
        ;(empty ? storage.deleteEntry(habit.id, date) : storage.saveEntry(entry)).catch(reportError)
      },

      setDayNa(date, na, note) {
        setData((d) => {
          if (!d) return d
          const naDays = { ...d.naDays }
          if (na) naDays[date] = { date, note }
          else delete naDays[date]
          return { ...d, naDays }
        })
        ;(na ? storage.saveNaDay({ date, note }) : storage.deleteNaDay(date)).catch(reportError)
      },

      setTheme(theme) {
        const settings = { ...data.settings, theme }
        setData((d) => d && { ...d, settings })
        storage.saveSettings(settings).catch(reportError)
      },

      replaceAll(next) {
        setData(next)
        storage.replaceAll(next).catch(reportError)
      },

      resetAll() {
        const initial = { ...createInitialData(today), settings: data.settings }
        setData(initial)
        storage.replaceAll(initial).catch(reportError)
      },
    }
  }, [data, today, saveHabits, storage])

  if (loadError) {
    return (
      <div className="p-6 text-center text-red-600">
        <p className="font-semibold">Impossibile leggere i dati salvati.</p>
        <p className="mt-2 text-sm">{loadError}</p>
      </div>
    )
  }
  if (!store) return null

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
