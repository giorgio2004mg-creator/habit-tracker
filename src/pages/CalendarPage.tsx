import { type ReactNode, useState } from 'react'
import { DayView } from '../components/DayView'
import { ChevronLeft, ChevronRight } from '../components/icons'
import { Modal } from '../components/Modal'
import { IconButton, PageHeader, cx } from '../components/ui'
import { StatusDot } from '../components/WeekSummary'
import {
  type ISODate,
  WEEKDAY_LETTERS,
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  formatLong,
  formatMonth,
  startOfMonth,
  startOfWeek,
} from '../lib/dates'
import { capitalize, formatPercent } from '../lib/format'
import { type DayStatus, dayStatus } from '../lib/progress'
import { dayCompletion } from '../lib/stats'
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

  const monthLabel = formatMonth(month)

  return (
    <>
      <PageHeader
        title="Calendario"
        subtitle={capitalize(monthLabel)}
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

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        <FilterChip active={filter === ALL} onClick={() => setFilter(ALL)}>
          Tutte
        </FilterChip>
        {habits.map((h) => (
          <FilterChip key={h.id} active={filter === h.id} onClick={() => setFilter(h.id)}>
            {h.icon} {h.name}
          </FilterChip>
        ))}
      </div>

      <div className="card p-3 sm:p-4">
        <div className="mb-2 grid grid-cols-7 text-center text-xs font-medium text-slate-400">
          {WEEKDAY_LETTERS.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {days.map((d) => {
            const inMonth = d.slice(0, 7) === month.slice(0, 7)
            const future = d > today
            const dayNum = Number(d.slice(8))
            const naDay = !!app.naDays[d]
            let content
            let title = formatLong(d)

            if (habit) {
              const s = dayStatus(app, habit, d, today)
              content = <HabitDay status={s} color={habit.color} />
              title += ` · ${STATUS_TEXT[s]}`
            } else {
              const c = naDay ? null : dayCompletion(app, habits, d)
              content = <OverallDay completion={future ? null : c} na={naDay} />
              if (c !== null && !future) title += ` · ${formatPercent(c)}`
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
                  'relative flex aspect-square flex-col items-center justify-start overflow-hidden rounded-xl p-1 text-xs transition hover:ring-2 hover:ring-emerald-500/40 disabled:pointer-events-none',
                  !inMonth && 'opacity-35',
                  future && 'opacity-40',
                  d === today && 'ring-2 ring-emerald-500',
                )}
              >
                {content}
                <span className="relative z-10 font-semibold tabular-nums">{dayNum}</span>
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

function HabitDay({ status, color }: { status: DayStatus; color: string }) {
  return (
    <span
      className={cx(
        'absolute inset-0 rounded-xl',
        status === 'empty' && 'bg-slate-50 dark:bg-slate-800/50',
        status === 'missed' && 'bg-red-50 ring-1 ring-red-200 ring-inset dark:bg-red-500/10 dark:ring-red-500/30',
        status === 'na' && 'hatched bg-slate-100 text-slate-500 dark:bg-slate-800',
      )}
      style={
        status === 'done'
          ? { backgroundColor: `${color}cc` }
          : status === 'partial'
            ? { backgroundColor: `${color}40` }
            : undefined
      }
    />
  )
}

/** Riempimento proporzionale alla quota di abitudini completate nel giorno. */
function OverallDay({ completion, na }: { completion: number | null; na: boolean }) {
  if (na) return <span className="hatched absolute inset-0 rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800" />
  return (
    <>
      <span className="absolute inset-0 rounded-xl bg-slate-50 dark:bg-slate-800/50" />
      {completion !== null && completion > 0 && (
        <span
          className="absolute inset-0 rounded-xl bg-emerald-500"
          style={{ opacity: 0.2 + completion * 0.65 }}
        />
      )}
    </>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition',
        active
          ? 'border-emerald-600 bg-emerald-600 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
      )}
    >
      {children}
    </button>
  )
}

function Legend({ habitColor }: { habitColor?: string }) {
  const items: { status: DayStatus; label: string }[] = habitColor
    ? [
        { status: 'done', label: 'Completato' },
        { status: 'partial', label: 'Parziale' },
        { status: 'missed', label: 'Mancato' },
        { status: 'na', label: 'Non applicabile' },
      ]
    : [
        { status: 'partial', label: 'Alcune completate' },
        { status: 'done', label: 'Tutte completate' },
        { status: 'na', label: 'Non applicabile' },
      ]
  const color = habitColor ?? '#10b981'
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <StatusDot status={i.status} color={color} />
          {i.label}
        </span>
      ))}
      <span>Tocca un giorno per vedere o modificare i dati.</span>
    </div>
  )
}
