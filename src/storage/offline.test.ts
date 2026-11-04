import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppData, Entry } from '../types'
import { createInitialData } from './seed'
import { createOfflineAdapter } from './offline'
import type { StorageAdapter } from './types'

// localStorage in memoria per l'ambiente Node
const memory = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k),
  clear: () => memory.clear(),
  key: () => null,
  length: 0,
} as Storage

const networkDown = () => Promise.reject(new TypeError('Failed to fetch'))

function fakeRemote(data: AppData) {
  let online = true
  const sent: string[] = []
  const ok = (name: string) => () => {
    if (!online) return networkDown()
    sent.push(name)
    return Promise.resolve()
  }
  const remote: StorageAdapter = {
    load: () => (online ? Promise.resolve(structuredClone(data)) : networkDown()),
    saveHabits: ok('saveHabits'),
    deleteHabit: ok('deleteHabit'),
    saveEntry: ok('saveEntry'),
    deleteEntry: ok('deleteEntry'),
    saveNaDay: ok('saveNaDay'),
    deleteNaDay: ok('deleteNaDay'),
    saveSettings: ok('saveSettings'),
    replaceAll: ok('replaceAll'),
  }
  return { remote, sent, setOnline: (v: boolean) => (online = v) }
}

const entry = (date: string): Entry => ({
  habitId: 'h',
  date,
  data: { type: 'check', done: true },
  updatedAt: '',
})

describe('createOfflineAdapter', () => {
  beforeEach(() => memory.clear())

  it('online: invia subito e tiene una copia locale', async () => {
    const { remote, sent } = fakeRemote(createInitialData('2026-11-04'))
    const adapter = createOfflineAdapter(remote, 'k')
    await adapter.load()
    await adapter.saveEntry(entry('2026-11-04'))
    await adapter.flush()
    expect(sent).toEqual(['saveEntry'])
    expect(adapter.pending()).toBe(0)
  })

  it('offline: carica la copia locale e mette in coda le modifiche', async () => {
    const net = fakeRemote(createInitialData('2026-11-04'))
    const adapter = createOfflineAdapter(net.remote, 'k')
    await adapter.load()

    net.setOnline(false)
    await adapter.saveEntry(entry('2026-11-04'))
    await adapter.saveEntry(entry('2026-11-05'))
    await adapter.flush()
    expect(adapter.pending()).toBe(2)

    const offline = await adapter.load()
    expect(Object.keys(offline!.entries)).toHaveLength(2)

    net.setOnline(true)
    await adapter.flush()
    expect(net.sent).toEqual(['saveEntry', 'saveEntry'])
    expect(adapter.pending()).toBe(0)
  })

  it('una modifica rifiutata dal server non blocca la coda', async () => {
    const net = fakeRemote(createInitialData('2026-11-04'))
    net.remote.saveNaDay = () => Promise.reject({ code: '42501', message: 'permission denied' })
    const onRejected = vi.fn()
    const adapter = createOfflineAdapter(net.remote, 'k', onRejected)
    await adapter.load()
    await adapter.saveNaDay({ date: '2026-11-04' })
    await adapter.saveEntry(entry('2026-11-04'))
    await adapter.flush()
    expect(onRejected).toHaveBeenCalledOnce()
    expect(net.sent).toEqual(['saveEntry'])
    expect(adapter.pending()).toBe(0)
  })

  it('replaceAll sostituisce le modifiche in coda', async () => {
    const net = fakeRemote(createInitialData('2026-11-04'))
    const adapter = createOfflineAdapter(net.remote, 'k')
    await adapter.load()
    net.setOnline(false)
    await adapter.saveEntry(entry('2026-11-04'))
    await adapter.replaceAll(createInitialData('2026-11-04'))
    expect(adapter.pending()).toBe(1)
    net.setOnline(true)
    await adapter.flush()
    expect(net.sent).toEqual(['replaceAll'])
  })
})
