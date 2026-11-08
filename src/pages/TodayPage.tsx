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

const ACCENT = '#ff4f1f'

function eyebrow(date: ISODate, today: ISODate) {
  const n = diffDays(date, today)
  if (n === 0) return 'Oggi'
  if (n === 1) return 'Ieri'
  return `${n} giorni fa`
}

type TileTone = 'accent' | 'paper' | 'ink'

const TONES: Record<TileTone, string> = {
  accent: 'rounded-[28px] bg-accent-500 text-white',
  paper: 'rounded-[28px] bg-paper dark:bg-ink-900',
  ink: 'aspect-square rounded-full bg-ink-900 text-white dark:bg-ink-50 dark:text-ink-900 items-center justify-center text-center',
}

/** Riquadro di riepilogo: etichetta mono, numero grande sottile, riga sotto. */
function StatTile({
  label,
  Icon,
  value,
  tone,
  foot,
}: {
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  value: ReactNode
  tone: TileTone
  foot: ReactNode
}) {
  return (
    <div className={cx('flex min-w-0 flex-col p-3.5 sm:p-5', TONES[tone])}>
      <p className={cx('label-mono flex items-center gap-1.5 text-[10px] tracking-[0.08em] sm:text-[11px] sm:tracking-[0.12em]', tone === 'paper' && 'text-ink-500 dark:text-ink-400')}>
        <Icon className={cx('hidden shrink-0 text-sm sm:inline', tone === 'ink' && 'text-accent-500')} />
        <span className="truncate">{label}</span>
      </p>
      <p className="my-2 text-[34px] leading-none font-light tracking-tight tabular-nums sm:my-3 sm:text-5xl">{value}</p>
      <div className={cx('min-w-0 truncate text-[11px] sm:text-xs', tone !== 'ink' && 'mt-auto', tone === 'paper' && 'text-ink-500 dark:text-ink-400', tone !== 'paper' && 'opacity-75')}>
        {foot}
      </div>
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
            <p className="label-mono inline-flex rounded-full bg-ink-900 px-3 py-1 text-white dark:bg-ink-50 dark:text-ink-900">
              {eyebrow(date, today)}
            </p>
            <h1 className="mt-3 font-serif text-[30px] leading-[0.95] text-balance italic sm:text-5xl">
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
                  'flex flex-col items-center gap-1.5 rounded-[20px] py-2 transition disabled:cursor-default',
                  selected
                    ? 'bg-ink-900 text-white dark:bg-ink-50 dark:text-ink-900'
                    : 'hover:bg-ink-900/5 dark:hover:bg-white/5',
                )}
              >
                <span
                  className={cx(
                    'font-mono text-[10px] tracking-wider uppercase',
                    selected
                      ? 'opacity-70'
                      : d === today
                        ? 'text-accent-600 dark:text-accent-400'
                      : future
                        ? 'text-ink-300 dark:text-ink-600'
                          : 'text-ink-500 dark:text-ink-400',
                  )}
                >
                  {WEEKDAY_SHORT[i]}
                </span>
                <ProgressRing value={rate ?? 0} color={ACCENT} size={34} stroke={3} dashed={future}>
                  <span
                    className={cx(
                      'text-sm font-semibold tabular-nums',
                      future && 'text-ink-300 dark:text-ink-600',
                      d === today && !selected && 'text-accent-600 dark:text-accent-400',
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
          label="Fatte"
          Icon={CheckIcon}
          tone="accent"
          value={
            due.length > 0 ? (
              <>
                {done}
                <span className="text-lg opacity-60 sm:text-2xl">/{due.length}</span>
              </>
            ) : (
              '—'
            )
          }
          foot={due.length > 0 ? <ProgressBar value={done / due.length} color="#ffffff" /> : 'Niente da fare'}
        />
        <StatTile
          label="Settimana"
          Icon={ChartIcon}
          tone="paper"
          value={weekRate === null ? '—' : formatPercent(weekRate)}
          foot="costanza"
        />
        <StatTile
          label="Serie"
          Icon={FlameIcon}
          tone="ink"
          value={top ? formatNumber(top.streak.current) : '0'}
          foot={top ? top.streak.unit : 'inizia oggi'}
        />
      </div>

      <div className="space-y-6">
        <DayView key={date} date={date} />
        <WeekSummary date={date} />
      </div>
    </>
  )
}
