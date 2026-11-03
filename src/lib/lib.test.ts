import { describe, expect, it } from 'vitest'
import { type AppData, type EntryData, type Habit, entryKey } from '../types'
import { addDays, startOfWeek, weekday } from './dates'
import { dayStatus, isCompleted } from './progress'
import { sleepMinutes } from './sleep'
import { computeStreak } from './streak'
import { completionRate } from './stats'

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h',
  name: 'Test',
  category: '',
  color: '#000',
  icon: '✅',
  type: 'check',
  frequency: { kind: 'daily' },
  archived: false,
  order: 0,
  createdAt: '2026-10-01',
  ...over,
})

function app(h: Habit, log: Record<string, EntryData | 'na'>, naDays: string[] = []): AppData {
  const entries: AppData['entries'] = {}
  for (const [date, v] of Object.entries(log)) {
    entries[entryKey(h.id, date)] =
      v === 'na' ? { habitId: h.id, date, na: true, updatedAt: '' } : { habitId: h.id, date, data: v, updatedAt: '' }
  }
  return {
    version: 1,
    habits: [h],
    entries,
    naDays: Object.fromEntries(naDays.map((d) => [d, { date: d }])),
    settings: { theme: 'system' },
  }
}

const done: EntryData = { type: 'check', done: true }

describe('dates', () => {
  it('la settimana inizia di lunedì', () => {
    expect(weekday('2026-11-02')).toBe(0) // lunedì
    expect(weekday('2026-11-08')).toBe(6) // domenica
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02')
  })

  it('gestisce il cambio dell\'ora legale', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
  })
})

describe('sleepMinutes', () => {
  it('passa la mezzanotte', () => {
    expect(sleepMinutes('23:30', '07:15')).toBe(7 * 60 + 45)
  })
  it('stesso giorno', () => {
    expect(sleepMinutes('00:30', '08:00')).toBe(7 * 60 + 30)
  })
  it('dati incompleti', () => {
    expect(sleepMinutes('23:00', undefined)).toBeNull()
  })
})

describe('isCompleted', () => {
  it('sonno: obiettivo raggiunto se ore ≥ obiettivo', () => {
    const h = habit({ type: 'sonno', target: 8 })
    expect(isCompleted(h, { type: 'sonno', bedtime: '23:00', wake: '07:00' })).toBe(true)
    expect(isCompleted(h, { type: 'sonno', bedtime: '23:30', wake: '07:15' })).toBe(false)
  })
  it('quantità con decimali', () => {
    const h = habit({ type: 'quantita', target: 2, step: 0.25 })
    expect(isCompleted(h, { type: 'quantita', value: 0.25 * 8 })).toBe(true)
  })
  it('pasti: conta solo quelli fatti', () => {
    const h = habit({ type: 'pasti', target: 4 })
    const meals = { colazione: { status: 'fatto' }, pranzo: { status: 'fatto' }, merenda: { status: 'saltato' }, cena: { status: 'fatto' } } as const
    expect(isCompleted(h, { type: 'pasti', meals })).toBe(false)
  })
  it('durata senza obiettivo: basta qualche minuto', () => {
    expect(isCompleted(habit({ type: 'durata' }), { type: 'durata', minutes: 10 })).toBe(true)
  })
})

describe('computeStreak (giornaliera)', () => {
  const h = habit()
  it('conta i giorni consecutivi e il record', () => {
    const a = app(h, { '2026-10-01': done, '2026-10-02': done, '2026-10-03': done, '2026-10-05': done, '2026-10-06': done })
    expect(computeStreak(a, h, '2026-10-06')).toEqual({ current: 2, best: 3, unit: 'giorni' })
  })
  it('oggi non ancora fatto non interrompe la serie', () => {
    const a = app(h, { '2026-10-01': done, '2026-10-02': done })
    expect(computeStreak(a, h, '2026-10-03').current).toBe(2)
  })
  it('i giorni non applicabili non interrompono la serie', () => {
    const a = app(h, { '2026-10-01': done, '2026-10-02': 'na', '2026-10-04': done }, ['2026-10-03'])
    expect(computeStreak(a, h, '2026-10-04').current).toBe(2)
  })
  it('giorni specifici: salta quelli non previsti', () => {
    // 2026-10-05 è lunedì
    const g = habit({ frequency: { kind: 'weekdays', days: [0, 2, 4] }, createdAt: '2026-10-05' })
    const a = app(g, { '2026-10-05': done, '2026-10-07': done, '2026-10-09': done })
    expect(computeStreak(a, g, '2026-10-11').current).toBe(3)
  })
})

describe('computeStreak (X volte a settimana)', () => {
  const h = habit({ frequency: { kind: 'weekly', times: 3 }, createdAt: '2026-10-05' })
  it('conta le settimane', () => {
    const a = app(h, {
      '2026-10-05': done, '2026-10-07': done, '2026-10-09': done,
      '2026-10-12': done, '2026-10-13': done, '2026-10-18': done,
      '2026-10-20': done,
    })
    // settimana in corso (19–25) ancora aperta: non interrompe
    expect(computeStreak(a, h, '2026-10-21')).toEqual({ current: 2, best: 2, unit: 'settimane' })
  })
  it('una settimana mancata azzera', () => {
    const a = app(h, { '2026-10-05': done, '2026-10-07': done, '2026-10-09': done, '2026-10-12': done })
    expect(computeStreak(a, h, '2026-10-21').current).toBe(0)
  })
})

describe('completionRate', () => {
  it('esclude i giorni non applicabili e oggi se non ancora fatto', () => {
    const h = habit()
    const a = app(h, { '2026-10-01': done, '2026-10-02': 'na', '2026-10-04': done })
    // 1, 3, 4 previsti (2 n/a); 5 = oggi non fatto
    expect(completionRate(a, h, '2026-10-01', '2026-10-31', '2026-10-05')).toEqual({ done: 2, total: 3 })
  })
})

describe('dayStatus', () => {
  it('distingue mancato, parziale e non applicabile', () => {
    const h = habit({ type: 'quantita', target: 2 })
    const a = app(h, { '2026-10-02': { type: 'quantita', value: 1 }, '2026-10-03': 'na' })
    expect(dayStatus(a, h, '2026-10-01', '2026-10-05')).toBe('missed')
    expect(dayStatus(a, h, '2026-10-02', '2026-10-05')).toBe('partial')
    expect(dayStatus(a, h, '2026-10-03', '2026-10-05')).toBe('na')
    expect(dayStatus(a, h, '2026-10-05', '2026-10-05')).toBe('empty')
  })
})
