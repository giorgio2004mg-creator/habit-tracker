import { describe, expect, it } from 'vitest'
import { completionRate } from '../lib/stats'
import { migrate } from './backup'
import { createDemoData } from './demo'

describe('createDemoData', () => {
  const today = '2026-11-04'
  const demo = createDemoData(today)

  it('produce dati validi', () => {
    expect(() => migrate(JSON.parse(JSON.stringify(demo)))).not.toThrow()
    expect(Object.keys(demo.entries).length).toBeGreaterThan(100)
  })

  it('è uguale a ogni apertura (a parte gli id)', () => {
    const again = createDemoData(today)
    expect(Object.keys(again.entries).length).toBe(Object.keys(demo.entries).length)
  })

  it('ogni abitudine ha giorni da conteggiare nelle statistiche', () => {
    for (const habit of demo.habits) {
      const r = completionRate(demo, habit, '2026-10-01', today, today)
      expect(r.total).toBeGreaterThan(0)
    }
  })
})
