import { type ComponentType, type ReactNode, type SVGProps, useState } from 'react'
import { DayView } from '../components/DayView'
import { CheckIcon, ChartIcon, ChevronLeft, ChevronRight, FlameIcon } from '../components/icons'
import { Button, IconButton, ProgressBar, ProgressRing, cx } from '../components/ui'
import { WeekSummary } from '../components/WeekSummary'
import {
  type ISODate,
  WEEKDAY_SHORT,
  addDays,
  diffDays,
  endOfWeek,
  formatLong,
  fromISO,
  minDate,
  startOfWeek,
} from '../lib/dates'
import { capitalize, formatNumber, formatPercent } from '../lib/format'
import { isCompletedOn, isNa } from '../lib/progress'
import { isScheduledOn } from '../lib/schedule'
import { dayCompletion, overallRate, ratio } from '../lib/stats'
import { type Streak, computeStreak } from '../lib/streak'
import { useStore } from '../state/store'

const ACCENT = '#10b981'

function eyebrow(date: ISODate, today: ISODate) {
  const n = diffDays(date, today)
  if (n === 0) return 'Oggi'
  if (n === 1) return 'Ieri'
  return `${n} giorni fa`
}

/** Riquadro di riepilogo: etichetta con icona, numero grande colorato, riga sotto. */
function StatTile({
  label,
  Icon,
  value,
  color,
  glow,
  foot,
}: {
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  value: ReactNode
  color: string
  glow?: boolean
  foot: ReactNode
}) {
  return (
    <div className="hcard flex min-w-0 flex-col p-3.5 sm:p-5">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 sm:text-xs dark:text-slate-400">
        <Icon className="shrink-0 text-sm" style={{ color }} />
        <span className="truncate">{label}</span>
      </p>
      <p
        className="mt-2 mb-2 text-[28px] leading-none font-bold tracking-tight tabular-nums sm:mt-3 sm:text-4xl"
        style={{ color, textShadow: glow ? `0 0 18px ${color}66` : undefined }}
      >
        {value}
      </p>
      <div className="mt-auto min-w-0 truncate text-[11px] text-slate-500 sm:text-xs dark:text-slate-400">{foot}</div>
    </div>
  )
}

export function TodayPage() {
  const { data: app, habits, today } = useStore()
  const [date, setDate] = useState(today)
  const isToday = date === today

  const due = habits.filter((h) => isScheduledOn(h, date) && !isNa(app, h, date))
  const done = due.filter((h) => isCompletedOn(app, h, date)).length

  const weekStart = startOfWeek(date)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const canNextWeek = weekStart < startOfWeek(today)
  const weekRate = ratio(overallRate(app, habits, weekStart, endOfWeek(date), today))

  // Serie più lunga in corso (a parità, meglio quelle in giorni)
  let top: { streak: Streak; name: string } | null = null
  for (const h of habits) {
    const s = computeStreak(app, h, today)
    if (s.current > 0 && (!top || s.current > top.streak.current)) top = { streak: s, name: h.name }
  }

  return (
    <>
      <header className="mb-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.18em] text-emerald-600 uppercase dark:text-emerald-400">
              {eyebrow(date, today)}
            </p>
            <h1 className="mt-1 truncate text-[26px] leading-tight font-bold tracking-tight sm:text-3xl">
              {capitalize(formatLong(date))}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!isToday && (
              <Button variant="ghost" onClick={() => setDate(today)}>
                Oggi
              </Button>
            )}
            <IconButton label="Settimana precedente" onClick={() => setDate(addDays(date, -7))}>
              <ChevronLeft />
            </IconButton>
            <IconButton
              label="Settimana successiva"
              onClick={() => setDate(minDate(addDays(date, 7), today))}
              disabled={!canNextWeek}
            >
              <ChevronRight />
            </IconButton>
          </div>
        </div>

        {/* Fascia lun–dom: anello = quota completata del giorno */}
        <nav aria-label="Giorni della settimana" className="hcard mt-4 grid grid-cols-7 gap-0.5 p-1.5 sm:gap-1 sm:p-2">
          {days.map((d, i) => {
            const future = d > today
            const selected = d === date
            const rate = future ? null : dayCompletion(app, habits, d)
            return (
              <button
                key={d}
                type="button"
                disabled={future}
                onClick={() => setDate(d)}
                aria-pressed={selected}
                aria-label={capitalize(formatLong(d))}
                className={cx(
                  'flex flex-col items-center gap-1.5 rounded-2xl py-2 transition disabled:cursor-default',
                  selected
                    ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30 ring-inset'
                    : 'hover:bg-slate-100 dark:hover:bg-white/5',
                )}
              >
                <span
                  className={cx(
                    'text-[10px] font-semibold tracking-wider uppercase',
                    d === today
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : future
                        ? 'text-slate-300 dark:text-slate-600'
                        : 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  {WEEKDAY_SHORT[i]}
                </span>
                <ProgressRing value={rate ?? 0} color={ACCENT} size={34} stroke={3} dashed={future}>
                  <span
                    className={cx(
                      'text-sm font-semibold tabular-nums',
                      future && 'text-slate-300 dark:text-slate-600',
                      d === today && 'text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    {fromISO(d).getDate()}
                  </span>
                </ProgressRing>
              </button>
            )
          })}
        </nav>
      </header>

      <div className="mb-6 grid grid-cols-3 gap-2.5 sm:gap-3">
        <StatTile
          label={isToday ? 'Fatte oggi' : 'Fatte'}
          Icon={CheckIcon}
          color={ACCENT}
          value={
            due.length > 0 ? (
              <>
                {done}
                <span className="text-lg text-slate-400 sm:text-xl dark:text-slate-500">/{due.length}</span>
              </>
            ) : (
              '—'
            )
          }
          foot={due.length > 0 ? <ProgressBar value={done / due.length} color={ACCENT} glow /> : 'Niente da fare'}
        />
        <StatTile
          label="Settimana"
          Icon={ChartIcon}
          color="#8b5cf6"
          value={weekRate === null ? '—' : formatPercent(weekRate)}
          foot="costanza"
        />
        <StatTile
          label="Serie"
          Icon={FlameIcon}
          color="#f97316"
          glow={!!top}
          value={top ? formatNumber(top.streak.current) : '0'}
          foot={top ? `${top.streak.unit} · ${top.name}` : 'Inizia oggi'}
        />
      </div>

      <div className="space-y-6">
        <DayView key={date} date={date} />
        <WeekSummary date={date} />
      </div>
    </>
  )
}
