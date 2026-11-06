import { type ReactNode, useState } from 'react'
import { DayView } from '../components/DayView'
import { ChevronLeft, ChevronRight } from '../components/icons'
import { Modal } from '../components/Modal'
import { IconButton, PageHeader, cx } from '../components/ui'
import {
  type ISODate,
  WEEKDAY_LETTERS,
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  formatLong,
  formatMonth,
  minDate,
  startOfMonth,
  startOfWeek,
} from '../lib/dates'
import { capitalize, formatPercent } from '../lib/format'
import { type DayStatus, dayStatus } from '../lib/progress'
import { dayCompletion, overallRate, ratio } from '../lib/stats'
import { useStore } from '../state/store'

const ALL = 'all'

export function CalendarPage() {
  const { data: app, habits, today } = useStore()
  const [month, setMonth] = useState(startOfMonth(today))
  const [filter, setFilter] = useState<string>(ALL)
  const [selected, setSelected] = useState<ISODate | null>(null)

  const habit = habits.find((h) => h.id === filter)
  const gridStart = startOfWeek(month)
  const gridEnd = endOfWeek(endOfMonth(month))
  const days: ISODate[] = []
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d)

  // Riepilogo del mese: percentuale e giorni completati del tutto
  const [monthName, year] = formatMonth(month).split(' ')
  const monthRate = ratio(overallRate(app, habit ? [habit] : habits, month, endOfMonth(month), today))
  let fullDays = 0
  for (let d = month; d <= minDate(endOfMonth(month), today); d = addDays(d, 1)) {
    if (habit ? dayStatus(app, habit, d, today) === 'done' : dayCompletion(app, habits, d) === 1) fullDays++
  }

  return (
    <>
      <PageHeader
        title={capitalize(monthName)}
        subtitle={`Calendario · ${year}`}
        actions={
          <>
            <IconButton label="Mese precedente" onClick={() => setMonth(addMonths(month, -1))}>
              <ChevronLeft />
            </IconButton>
            <IconButton
              label="Mese successivo"
              onClick={() => setMonth(addMonths(month, 1))}
              disabled={month >= startOfMonth(today)}
            >
              <ChevronRight />
            </IconButton>
          </>
        }
      />

      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="label-mono truncate text-ink-500 dark:text-ink-400">{habit ? habit.name : 'Completamento'}</p>
          <p className="mt-1 font-dot text-6xl leading-none font-bold tracking-tight sm:text-7xl">
            {monthRate === null ? '--' : Math.round(monthRate * 100)}
            <span className="ml-1 font-mono text-xl font-normal text-ink-500">%</span>
          </p>
        </div>
        <p className="shrink-0 pb-1 text-right">
          <span className="block text-4xl leading-none font-light tabular-nums">{fullDays}</span>
          <span className="label-mono text-ink-500 dark:text-ink-400">
            {fullDays === 1 ? 'giorno pieno' : 'giorni pieni'}
          </span>
        </p>
      </div>

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
        <FilterChip active={filter === ALL} onClick={() => setFilter(ALL)}>
          Tutte
        </FilterChip>
        {habits.map((h) => (
          <FilterChip key={h.id} active={filter === h.id} onClick={() => setFilter(h.id)}>
            {h.icon} {h.name}
          </FilterChip>
        ))}
      </div>

      <div className="card p-3 sm:p-5">
        <div className="mb-2 grid grid-cols-7 text-center font-mono text-[11px] text-ink-400">
          {WEEKDAY_LETTERS.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((d) => {
            const inMonth = d.slice(0, 7) === month.slice(0, 7)
            const future = d > today
            const naDay = !!app.naDays[d]
            let title = formatLong(d)
            let cell: CellProps

            if (habit) {
              const s = dayStatus(app, habit, d, today)
              cell = { kind: s, color: habit.color }
              if (s !== 'empty') title += ` · ${STATUS_TEXT[s]}`
            } else {
              const c = naDay || future ? null : dayCompletion(app, habits, d)
              cell = naDay ? { kind: 'na' } : { kind: 'overall', completion: c }
              if (c !== null) title += ` · ${formatPercent(c)}`
              if (naDay) title += ' · non applicabile'
            }

            return (
              <button
                key={d}
                type="button"
                disabled={future}
                onClick={() => setSelected(d)}
                title={title}
                className={cx(
                  'group flex aspect-square items-center justify-center rounded-full disabled:pointer-events-none',
                  !inMonth && 'opacity-30',
                )}
              >
                <DayCell {...cell} day={Number(d.slice(8))} future={future} isToday={d === today} />
              </button>
            )
          })}
        </div>
      </div>

      <Legend habitColor={habit?.color} />

      {selected && (
        <Modal title={capitalize(formatLong(selected))} onClose={() => setSelected(null)}>
          <DayView date={selected} />
        </Modal>
      )}
    </>
  )
}

const STATUS_TEXT: Record<DayStatus, string> = {
  done: 'completato',
  partial: 'parziale',
  missed: 'mancato',
  na: 'non applicabile',
  empty: '',
}

type CellProps = { kind: DayStatus; color?: string } | { kind: 'overall'; completion: number | null }

/**
 * Un giorno come cerchio: pieno = tutto fatto, fetta arancio = in parte,
 * tratteggio = non applicabile, bordo tratteggiato = futuro.
 */
function DayCell(props: CellProps & { day?: number; future?: boolean; isToday?: boolean; small?: boolean }) {
  const { day, future, isToday, small } = props
  const base = cx(
    'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full tabular-nums transition',
    small ? 'size-4' : 'aspect-square w-full max-w-12 text-xs font-medium group-hover:scale-105 sm:max-w-14 sm:text-sm',
    isToday && 'ring-2 ring-accent-500 ring-offset-2 ring-offset-paper dark:ring-offset-ink-900',
  )
  const empty = cx(
    base,
    'border border-ink-300 dark:border-white/15',
    future && 'border-dashed text-ink-400 dark:text-ink-500',
  )
  const label = day !== undefined && <span className="relative">{day}</span>

  if (props.kind === 'overall') {
    const c = props.completion
    if (c === 1) return <span className={cx(base, 'bg-ink-900 text-white dark:bg-ink-50 dark:text-ink-900')}>{label}</span>
    if (c !== null && c > 0)
      return (
        <span className={empty}>
          <span
            className="absolute inset-0"
            style={{ background: `conic-gradient(var(--color-accent-400) ${c * 360}deg, transparent 0)` }}
          />
          {label}
        </span>
      )
    return <span className={empty}>{label}</span>
  }

  const color = props.color ?? '#ff4f1f'
  switch (props.kind) {
    case 'done':
      return (
        <span className={cx(base, 'text-white')} style={{ backgroundColor: color }}>
          {label}
        </span>
      )
    case 'partial':
      return (
        <span className={cx(base, 'border-2')} style={{ borderColor: color, backgroundColor: `${color}33` }}>
          {label}
        </span>
      )
    case 'missed':
      return (
        <span className={cx(base, 'border-2 border-dashed border-accent-400 text-accent-600 dark:text-accent-400')}>
          {label}
        </span>
      )
    case 'na':
      return (
        <span className={cx(base, 'hatched border border-ink-300 text-ink-500 dark:border-white/15 dark:text-ink-400')}>
          {label}
        </span>
      )
    default:
      return <span className={empty}>{label}</span>
  }
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition',
        active
          ? 'bg-ink-900 text-white dark:bg-ink-50 dark:text-ink-900'
          : 'bg-paper text-ink-700 hover:bg-white dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800',
      )}
    >
      {children}
    </button>
  )
}

function Legend({ habitColor }: { habitColor?: string }) {
  const items: { cell: CellProps; label: string }[] = habitColor
    ? [
        { cell: { kind: 'done', color: habitColor }, label: 'Completato' },
        { cell: { kind: 'partial', color: habitColor }, label: 'Parziale' },
        { cell: { kind: 'missed' }, label: 'Mancato' },
        { cell: { kind: 'na' }, label: 'Non applicabile' },
      ]
    : [
        { cell: { kind: 'overall', completion: 0.5 }, label: 'In parte' },
        { cell: { kind: 'overall', completion: 1 }, label: 'Tutte fatte' },
        { cell: { kind: 'na' }, label: 'Non applicabile' },
      ]
  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[11px] text-ink-500 dark:text-ink-400">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <DayCell {...i.cell} small />
          {i.label}
        </span>
      ))}
      <span className="w-full">Tocca un giorno per vedere o modificare i dati.</span>
    </div>
  )
}
