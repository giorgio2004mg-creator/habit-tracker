import { type ISODate, WEEKDAY_LETTERS, addDays, endOfWeek, startOfWeek } from '../lib/dates'
import { formatPercent } from '../lib/format'
import { type DayStatus, dayStatus } from '../lib/progress'
import { overallRate, ratio } from '../lib/stats'
import { weekResult } from '../lib/streak'
import { useStore } from '../state/store'
import { HabitIcon, SectionTitle, cx } from './ui'

const STATUS_LABEL: Record<DayStatus, string> = {
  done: 'completato',
  partial: 'parziale',
  missed: 'mancato',
  na: 'non applicabile',
  empty: 'nessun dato',
}

export function StatusDot({ status, color }: { status: DayStatus; color: string }) {
  return (
    <span
      className={cx(
        'inline-block size-5 rounded-md',
        status === 'empty' && 'bg-slate-100 dark:bg-slate-800',
        status === 'missed' && 'border-2 border-red-300 dark:border-red-500/50',
        status === 'na' && 'hatched bg-slate-100 text-slate-500 dark:bg-slate-800',
      )}
      style={
        status === 'done'
          ? { backgroundColor: color }
          : status === 'partial'
            ? { backgroundColor: `${color}55` }
            : undefined
      }
    />
  )
}

/** "La tua costanza questa settimana": percentuale complessiva e griglia lun–dom. */
export function WeekSummary({ date }: { date: ISODate }) {
  const { data: app, habits, today } = useStore()
  const weekStart = startOfWeek(date)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const rate = ratio(overallRate(app, habits, weekStart, endOfWeek(date), today))

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <SectionTitle className="mb-0">La tua costanza questa settimana</SectionTitle>
        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {rate === null ? '—' : formatPercent(rate)}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="sr-only">Abitudine</th>
            {days.map((d, i) => (
              <th
                key={d}
                className={cx(
                  'pb-1 text-center text-xs font-medium text-slate-400',
                  d === today && 'text-emerald-600 dark:text-emerald-400',
                )}
              >
                {WEEKDAY_LETTERS[i]}
              </th>
            ))}
            <th className="sr-only">Settimana</th>
          </tr>
        </thead>
        <tbody>
          {habits.map((h) => {
            const week = h.frequency.kind === 'weekly' ? weekResult(app, h, weekStart, today) : null
            return (
              <tr key={h.id}>
                <td className="py-1 pr-2">
                  <span className="flex items-center gap-2">
                    <HabitIcon icon={h.icon} color={h.color} size="sm" />
                    <span className="hidden truncate sm:inline">{h.name}</span>
                  </span>
                </td>
                {days.map((d) => {
                  const s = dayStatus(app, h, d, today)
                  return (
                    <td key={d} className="text-center" title={`${h.name} · ${STATUS_LABEL[s]}`}>
                      <StatusDot status={s} color={h.color} />
                    </td>
                  )
                })}
                <td className="w-10 pl-1 text-right text-xs text-slate-500 tabular-nums dark:text-slate-400">
                  {week && `${week.done}/${week.required}`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
