import { describe, expect, it } from 'vitest'
import type { Entry, Habit } from '../types'
import { entryToRow, habitToRow, rowToEntry, rowToHabit } from './supabase'

const habit: Habit = {
  id: 'h1',
  name: 'Acqua',
  category: 'Salute',
  color: '#3b82f6',
  icon: '💧',
  type: 'quantita',
  frequency: { kind: 'daily' },
  target: 2,
  unit: 'L',
  step: 0.25,
  archived: false,
  order: 3,
  createdAt: '2026-10-19',
}

describe('mappatura righe Supabase', () => {
  it('abitudine: andata e ritorno senza perdite', () => {
    expect(rowToHabit(habitToRow(habit, 'u1'))).toEqual(habit)
  })

  it('abitudine: i numeric arrivano anche come stringhe', () => {
    const row = { ...habitToRow(habit, 'u1'), target: '2' as unknown as number, step: '0.25' as unknown as number }
    expect(rowToHabit(row)).toMatchObject({ target: 2, step: 0.25 })
  })

  it('abitudine: campi facoltativi assenti', () => {
    const h: Habit = { ...habit, type: 'check', target: undefined, unit: undefined, step: undefined }
    expect(rowToHabit(habitToRow(h, 'u1'))).toEqual(h)
  })

  it('registrazione: andata e ritorno', () => {
    const e: Entry = { habitId: 'h1', date: '2026-10-20', data: { type: 'quantita', value: 2 }, updatedAt: '2026-10-20T21:00:00.000Z' }
    expect(rowToEntry(entryToRow(e, 'u1'))).toEqual(e)
  })

  it('registrazione non applicabile senza dati', () => {
    const e: Entry = { habitId: 'h1', date: '2026-10-21', na: true, updatedAt: '2026-10-21T08:00:00.000Z' }
    expect(entryToRow(e, 'u1')).toMatchObject({ na: true, data: null })
    expect(rowToEntry(entryToRow(e, 'u1'))).toEqual(e)
  })
})
