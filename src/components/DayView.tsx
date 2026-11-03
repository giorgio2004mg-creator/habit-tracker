import { useState } from 'react'
import type { ISODate } from '../lib/dates'
import { isScheduledOn } from '../lib/schedule'
import { useStore } from '../state/store'
import { HabitCard } from './HabitCard'
import { ChevronDown, PauseIcon } from './icons'
import { Button, SectionTitle, cx } from './ui'

const NA_REASONS = ['Vacanza', 'Malattia', 'Altro']

/** Tutte le abitudini di un giorno, con check-in. Usata da "Oggi" e dal calendario. */
export function DayView({ date }: { date: ISODate }) {
  const store = useStore()
  const naDay = store.data.naDays[date]
  const [askReason, setAskReason] = useState(false)
  const [showOthers, setShowOthers] = useState(false)

  const due = store.habits.filter((h) => isScheduledOn(h, date))
  const others = store.habits.filter((h) => !isScheduledOn(h, date))

  if (store.habits.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Nessuna abitudine attiva. <a href="#/abitudini" className="font-medium text-emerald-600 underline">Creane una</a>.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {naDay && (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-200/70 px-4 py-3 text-sm dark:bg-slate-800">
          <PauseIcon className="shrink-0 text-xl text-slate-500" />
          <div className="flex-1">
            <p className="font-semibold">Giornata non applicabile{naDay.note ? ` · ${naDay.note}` : ''}</p>
            <p className="text-slate-500 dark:text-slate-400">Non interrompe le serie e non conta nelle percentuali.</p>
          </div>
          <Button variant="ghost" onClick={() => store.setDayNa(date, false)}>
            Annulla
          </Button>
        </div>
      )}

      <section className="space-y-3">
        {due.map((h) => (
          <HabitCard key={h.id} habit={h} date={date} />
        ))}
        {due.length === 0 && (
          <p className="card p-5 text-center text-sm text-slate-500 dark:text-slate-400">
            Nessuna abitudine prevista per questo giorno.
          </p>
        )}
      </section>

      {others.length > 0 && (
        <section>
          <button
            type="button"
            className="flex w-full items-center gap-1"
            onClick={() => setShowOthers((v) => !v)}
            aria-expanded={showOthers}
          >
            <SectionTitle className="mb-0">Non previste oggi ({others.length})</SectionTitle>
            <ChevronDown className={cx('text-slate-400 transition', showOthers && 'rotate-180')} />
          </button>
          {showOthers && (
            <div className="mt-3 space-y-3">
              {others.map((h) => (
                <HabitCard key={h.id} habit={h} date={date} />
              ))}
            </div>
          )}
        </section>
      )}

      {!naDay && (
        <div className="text-center">
          {askReason ? (
            <div className="card inline-flex flex-wrap items-center justify-center gap-2 p-3">
              <span className="text-sm text-slate-600 dark:text-slate-300">Motivo:</span>
              {NA_REASONS.map((r) => (
                <Button
                  key={r}
                  onClick={() => {
                    store.setDayNa(date, true, r === 'Altro' ? undefined : r)
                    setAskReason(false)
                  }}
                >
                  {r}
                </Button>
              ))}
              <Button variant="ghost" onClick={() => setAskReason(false)}>
                Annulla
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setAskReason(true)}>
              <PauseIcon /> Segna tutta la giornata come non applicabile
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
