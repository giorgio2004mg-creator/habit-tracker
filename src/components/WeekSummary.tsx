import { type ISODate, WEEKDAY_SHORT, addDays, endOfWeek, formatShort, startOfWeek } from '../lib/dates'
import { type DayStatus, dayStatus } from '../lib/progress'
import { weekResult } from '../lib/streak'
import { useStore } from '../state/store'
import { CheckIcon, MinusIcon } from './icons'
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
        status === 'empty' && 'bg-ink-100 dark:bg-ink-800',
        status === 'missed' && 'border-2 border-red-300 dark:border-red-500/50',
        status === 'na' && 'hatched bg-ink-100 text-ink-500 dark:bg-ink-800',
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

/** Cerchio di un giorno nel riepilogo della home: pieno, parziale, mancato, futuro. */
function DayCircle({ status, color, future, isToday }: { status: DayStatus; color: string; future: boolean; isToday: boolean }) {
  const base = 'inline-flex size-7 items-center justify-center rounded-full text-sm sm:size-8'
  if (status === 'done')
    return (
      <span className={cx(base, 'text-white')} style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}55` }}>
        <CheckIcon />
      </span>
    )
  if (status === 'partial')
    return <span className={cx(base, 'border-2')} style={{ borderColor: color, backgroundColor: `${color}22` }} />
  if (status === 'missed')
    return (
      <span className={cx(base, 'border-2 border-accent-300 text-accent-500 dark:border-accent-500/40')}>
        <MinusIcon />
      </span>
    )
  if (status === 'na') return <span className={cx(base, 'hatched bg-ink-100 text-ink-400 dark:bg-white/5')} />
  return (
    <span
      className={cx(
        base,
        future
          ? 'border-2 border-dashed border-ink-300 dark:border-white/10'
          : isToday
            ? 'border-2 border-ink-900 dark:border-white/60'
            : 'border-2 border-ink-300 dark:border-white/10',
      )}
    />
  )
}

/** "La tua costanza questa settimana": un cerchio per abitudine e per giorno, lun–dom. */
export function WeekSummary({ date }: { date: ISODate }) {
  const { data: app, habits, today } = useStore()
  const weekStart = startOfWeek(date)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <section className="hcard p-4 sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <SectionTitle className="mb-0">La tua costanza questa settimana</SectionTitle>
        <span className="shrink-0 font-mono text-[11px] text-ink-400 dark:text-ink-500">
          {formatShort(weekStart)} – {formatShort(endOfWeek(date))}
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
                  'pb-2 text-center font-mono text-[10px] tracking-wider uppercase',
                  d === today ? 'text-accent-600 dark:text-accent-400' : 'text-ink-400 dark:text-ink-500',
                )}
              >
                {WEEKDAY_SHORT[i]}
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
                <td className="py-1.5 pr-2">
                  <span className="flex items-center gap-2">
                    <HabitIcon icon={h.icon} color={h.color} size="sm" />
                    <span className="hidden truncate sm:inline">{h.name}</span>
                  </span>
                </td>
                {days.map((d) => {
                  const s = dayStatus(app, h, d, today)
                  return (
                    <td key={d} className="py-1.5 text-center" title={`${h.name} · ${STATUS_LABEL[s]}`}>
                      <DayCircle status={s} color={h.color} future={d > today} isToday={d === today} />
                    </td>
                  )
                })}
                <td className="w-10 pl-1 text-right text-xs text-ink-500 tabular-nums dark:text-ink-400">
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
