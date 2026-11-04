import type { AppData, Entry, Habit, NaDay, Settings } from '../types'
import type { ISODate } from '../lib/dates'
import { newId } from '../lib/id'
import { createLocalStorageAdapter } from './localStorage'
import type { StorageAdapter } from './types'

type Op = { id: string } & (
  | { kind: 'saveHabits'; habits: Habit[] }
  | { kind: 'deleteHabit'; habitId: string }
  | { kind: 'saveEntry'; entry: Entry }
  | { kind: 'deleteEntry'; habitId: string; date: ISODate }
  | { kind: 'saveNaDay'; day: NaDay }
  | { kind: 'deleteNaDay'; date: ISODate }
  | { kind: 'saveSettings'; settings: Settings }
  | { kind: 'replaceAll'; data: AppData }
)

type OpInput = Op extends infer O ? (O extends Op ? Omit<O, 'id'> : never) : never

export interface OfflineAdapter extends StorageAdapter {
  /** Invia le modifiche in coda; si ferma al primo errore di rete */
  flush(): Promise<void>
  /** Modifiche non ancora arrivate al server */
  pending(): number
}

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const message = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err)
  return /fetch|network|load failed|timed? ?out/i.test(message)
}

/**
 * Avvolge un adapter remoto: copia locale dei dati e coda delle modifiche.
 * Le scritture non falliscono mai per mancanza di rete: restano in coda
 * (in localStorage, quindi sopravvivono alla chiusura dell'app) e partono
 * appena il server risponde. Le modifiche rifiutate dal server vengono
 * scartate per non bloccare la coda.
 */
export function createOfflineAdapter(
  remote: StorageAdapter,
  key: string,
  onRejected: (err: unknown) => void = console.error,
): OfflineAdapter {
  const cache = createLocalStorageAdapter(`${key}:cache`)
  const outboxKey = `${key}:outbox`
  let flushing: Promise<void> | null = null

  const readOutbox = (): Op[] => JSON.parse(localStorage.getItem(outboxKey) ?? '[]')
  const writeOutbox = (ops: Op[]) => localStorage.setItem(outboxKey, JSON.stringify(ops))

  const send = (op: Op): Promise<void> => {
    switch (op.kind) {
      case 'saveHabits':
        return remote.saveHabits(op.habits)
      case 'deleteHabit':
        return remote.deleteHabit(op.habitId)
      case 'saveEntry':
        return remote.saveEntry(op.entry)
      case 'deleteEntry':
        return remote.deleteEntry(op.habitId, op.date)
      case 'saveNaDay':
        return remote.saveNaDay(op.day)
      case 'deleteNaDay':
        return remote.deleteNaDay(op.date)
      case 'saveSettings':
        return remote.saveSettings(op.settings)
      case 'replaceAll':
        return remote.replaceAll(op.data)
    }
  }

  async function drain() {
    for (let op = readOutbox()[0]; op; op = readOutbox()[0]) {
      try {
        await send(op)
      } catch (err) {
        if (isNetworkError(err)) return
        onRejected(err)
      }
      // Rimozione per id: nel frattempo la coda può essere cambiata
      writeOutbox(readOutbox().filter((o) => o.id !== op.id))
    }
  }

  // Richiesto un invio mentre uno è in corso: si fa un altro giro alla fine
  let again = false

  function flush(): Promise<void> {
    if (flushing) {
      again = true
      return flushing
    }
    flushing = (async () => {
      do {
        again = false
        await drain()
      } while (again)
    })().finally(() => {
      flushing = null
    })
    return flushing
  }

  /** Aggiorna subito la copia locale, poi mette in coda l'invio al server */
  async function enqueue(input: OpInput, applyLocally: () => Promise<void>) {
    await applyLocally().catch(console.error)
    const op = { ...input, id: newId() } as Op
    // replaceAll sostituisce tutto: le modifiche precedenti in coda non servono più
    writeOutbox(op.kind === 'replaceAll' ? [op] : [...readOutbox(), op])
    void flush()
  }

  return {
    flush,
    pending: () => readOutbox().length,

    async load() {
      await flush()
      // Ancora modifiche in coda: la copia locale è più aggiornata del server
      if (readOutbox().length > 0) return cache.load()
      try {
        const data = await remote.load()
        if (data) await cache.replaceAll(data)
        return data
      } catch (err) {
        const cached = isNetworkError(err) ? await cache.load() : null
        if (cached) return cached
        throw err
      }
    },

    saveHabits: (habits) => enqueue({ kind: 'saveHabits', habits }, () => cache.saveHabits(habits)),
    deleteHabit: (habitId) => enqueue({ kind: 'deleteHabit', habitId }, () => cache.deleteHabit(habitId)),
    saveEntry: (entry) => enqueue({ kind: 'saveEntry', entry }, () => cache.saveEntry(entry)),
    deleteEntry: (habitId, date) =>
      enqueue({ kind: 'deleteEntry', habitId, date }, () => cache.deleteEntry(habitId, date)),
    saveNaDay: (day) => enqueue({ kind: 'saveNaDay', day }, () => cache.saveNaDay(day)),
    deleteNaDay: (date) => enqueue({ kind: 'deleteNaDay', date }, () => cache.deleteNaDay(date)),
    saveSettings: (settings) => enqueue({ kind: 'saveSettings', settings }, () => cache.saveSettings(settings)),
    replaceAll: (data) => enqueue({ kind: 'replaceAll', data }, () => cache.replaceAll(data)),
  }
}
