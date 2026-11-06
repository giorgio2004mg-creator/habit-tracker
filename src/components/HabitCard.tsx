import type { EntryData, Habit } from '../types'
import { type ISODate, startOfWeek } from '../lib/dates'
import { formatNumber } from '../lib/format'
import { getEntry, isCompleted, progressOf } from '../lib/progress'
import { frequencyLabel } from '../lib/schedule'
import { computeStreak, weekResult } from '../lib/streak'
import { useStore } from '../state/store'
import { CheckIcon, FlameIcon, PauseIcon } from './icons'
import { CheckTracker, DurationTracker, MealsTracker, QuantityTracker, SleepTracker } from './trackers'
import { Button, HabitIcon, IconButton, ProgressRing, cx } from './ui'

function Tracker({ habit, data, onChange }: { habit: Habit; data?: EntryData; onChange: (d?: EntryData) => void }) {
  // Se il tipo dell'abitudine non corrisponde ai dati salvati si riparte da vuoto
  const d = data?.type === habit.type ? data : undefined
  switch (habit.type) {
    case 'check':
      return <CheckTracker habit={habit} data={d as Extract<EntryData, { type: 'check' }>} onChange={onChange} />
    case 'quantita':
      return <QuantityTracker habit={habit} data={d as Extract<EntryData, { type: 'quantita' }>} onChange={onChange} />
    case 'durata':
      return <DurationTracker habit={habit} data={d as Extract<EntryData, { type: 'durata' }>} onChange={onChange} />
    case 'sonno':
      return <SleepTracker habit={habit} data={d as Extract<EntryData, { type: 'sonno' }>} onChange={onChange} />
    case 'pasti':
      return <MealsTracker habit={habit} data={d as Extract<EntryData, { type: 'pasti' }>} onChange={onChange} />
  }
}

export function HabitCard({ habit, date }: { habit: Habit; date: ISODate }) {
  const store = useStore()
  const { data: app, today } = store
  const entry = getEntry(app, habit.id, date)
  const dayNa = !!app.naDays[date]
  const na = dayNa || !!entry?.na
  const completed = !na && isCompleted(habit, entry?.data)
  const streak = computeStreak(app, habit, today)

  let subtitle = frequencyLabel(habit.frequency)
  if (habit.frequency.kind === 'weekly') {
    const week = weekResult(app, habit, startOfWeek(date), today)
    subtitle = `${week.done}/${week.required} questa settimana`
  }

  const progress = na ? 0 : progressOf(habit, entry?.data)

  return (
    <article
      className={cx('hcard relative p-4 transition sm:p-5', na && 'opacity-60')}
      style={
        completed
          ? { backgroundImage: `radial-gradient(120% 90% at 100% 0%, ${habit.color}24, transparent 60%)` }
          : undefined
      }
    >
      <header className="mb-4 flex items-center gap-3">
        <HabitIcon icon={habit.icon} color={habit.color} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold sm:text-base">{habit.name}</h3>
          <p className="flex min-w-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate">{subtitle}</span>
            {streak.current > 0 && (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-orange-500 dark:text-orange-400"
                title={`Serie attuale: ${streak.current} ${streak.unit} · record ${streak.best}`}
              >
                <FlameIcon className="drop-shadow-[0_0_5px_rgb(249_115_22/0.7)]" /> {formatNumber(streak.current)}
                {streak.unit === 'settimane' && <span className="font-normal">sett</span>}
              </span>
            )}
          </p>
        </div>
        {!dayNa && (
          <IconButton
            label={entry?.na ? 'Annulla non applicabile' : 'Segna come non applicabile'}
            onClick={() => store.setHabitNa(habit, date, !entry?.na)}
            className={cx(entry?.na && 'text-slate-800 dark:text-slate-100')}
          >
            <PauseIcon />
          </IconButton>
        )}
        {!na && (
          <ProgressRing
            value={progress}
            color={habit.color}
            size={46}
            stroke={4}
            label={completed ? 'Completata' : `Avanzamento ${Math.round(progress * 100)}%`}
          >
            {completed ? (
              <span
                className="inline-flex size-7 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: habit.color, boxShadow: `0 0 14px ${habit.color}88` }}
              >
                <CheckIcon />
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-500 tabular-nums dark:text-slate-400">
                {Math.round(progress * 100)}%
              </span>
            )}
          </ProgressRing>
        )}
      </header>

      {na ? (
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
          <span>Non applicabile {dayNa ? 'per tutta la giornata' : 'in questo giorno'}</span>
          {!dayNa && (
            <Button variant="ghost" className="py-1" onClick={() => store.setHabitNa(habit, date, false)}>
              Annulla
            </Button>
          )}
        </div>
      ) : (
        <Tracker habit={habit} data={entry?.data} onChange={(d) => store.setEntryData(habit, date, d)} />
      )}
    </article>
  )
}
