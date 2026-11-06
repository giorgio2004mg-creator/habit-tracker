import { type ReactNode, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronLeft, ChevronRight, FlameIcon } from '../components/icons'
import { IconButton, PageHeader, SectionTitle, Segmented, cx } from '../components/ui'
import type { AppData, Habit } from '../types'
import {
  type ISODate,
  addDays,
  addMonths,
  eachDay,
  endOfMonth,
  endOfWeek,
  formatMonth,
  formatShort,
  startOfMonth,
  startOfWeek,
} from '../lib/dates'
import { formatMinutes, formatNumber, formatOneDecimal } from '../lib/format'
import { amountOf, getEntry, hasData } from '../lib/progress'
import { amountSummary, completionRate, dayCompletion, overallRate, ratio } from '../lib/stats'
import { type Streak, computeStreak } from '../lib/streak'
import { useStore } from '../state/store'

type Period = 'week' | 'month'

const ACCENT = '#ff4f1f'
const TICK = { fontSize: 10, fill: '#8d8e88', fontFamily: 'DM Mono, monospace' }

/** Rispetta l'impostazione di sistema "riduci movimento" */
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function periodRange(period: Period, anchor: ISODate): [ISODate, ISODate] {
  return period === 'week' ? [startOfWeek(anchor), endOfWeek(anchor)] : [startOfMonth(anchor), endOfMonth(anchor)]
}

function periodLabel(period: Period, from: ISODate, to: ISODate): string {
  return period === 'week' ? `${formatShort(from)} – ${formatShort(to)}` : formatMonth(from)
}

export function StatsPage() {
  const { data: app, habits, today } = useStore()
  const [period, setPeriod] = useState<Period>('week')
  const [anchor, setAnchor] = useState(today)
  const [from, to] = periodRange(period, anchor)
  const isCurrent = to >= today

  const shift = (dir: -1 | 1) =>
    setAnchor(period === 'week' ? addDays(anchor, dir * 7) : addMonths(anchor, dir))

  const overall = ratio(overallRate(app, habits, from, to, today))
  const trend = eachDay(from, to).map((d) => {
    const c = d > today ? null : dayCompletion(app, habits, d)
    return { date: d, label: period === 'week' ? formatShort(d).split(' ')[0] : String(Number(d.slice(8))), value: c === null ? null : Math.round(c * 100) }
  })
  const fullDays = trend.filter((t) => t.value === 100).length

  const streaks = habits.map((h) => ({ habit: h, streak: computeStreak(app, h, today) }))
  const topNow = streaks.reduce<{ habit: Habit; streak: Streak } | null>(
    (best, s) => (s.streak.current > (best?.streak.current ?? 0) ? s : best),
    null,
  )
  const record = streaks.reduce<{ habit: Habit; streak: Streak } | null>(
    (best, s) => (s.streak.best > (best?.streak.best ?? 0) ? s : best),
    null,
  )

  return (
    <>
      <PageHeader
        title="Statistiche"
        subtitle={periodLabel(period, from, to)}
        actions={
          <>
            <IconButton label="Periodo precedente" onClick={() => shift(-1)}>
              <ChevronLeft />
            </IconButton>
            <IconButton label="Periodo successivo" onClick={() => shift(1)} disabled={isCurrent}>
              <ChevronRight />
            </IconButton>
          </>
        }
      />

      <Segmented
        className="mb-6"
        value={period}
        onChange={(p) => {
          setPeriod(p)
          setAnchor(today)
        }}
        options={[
          { value: 'week', label: 'Settimana' },
          { value: 'month', label: 'Mese' },
        ]}
      />

      {/* Numero gigante a puntini + torta */}
      <section className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="label-mono inline-flex rounded-full bg-ink-900 px-3 py-1 text-white dark:bg-ink-50 dark:text-ink-900">
            Completamento
          </span>
          <p className="mt-4 font-dot text-[84px] leading-[0.85] font-bold tracking-tight sm:text-[112px]">
            {overall === null ? '--' : Math.round(overall * 100)}
            <span className="ml-1 font-mono text-2xl font-normal text-ink-500">%</span>
          </p>
        </div>
        <Pie value={overall ?? 0} />
      </section>

      {/* Valori medi, numeri sottili con unità piccola */}
      <section className="mb-6 flex flex-wrap gap-x-7 gap-y-4">
        {habits.map((h) => {
          const r = readoutOf(h, amountSummary(app, h, from, to))
          if (!r) return null
          return (
            <div key={h.id} className="min-w-0">
              <p className="text-[34px] leading-none font-light tracking-tight tabular-nums">
                {r.value}
                <span className="ml-1 text-sm font-semibold tracking-normal">{r.unit}</span>
              </p>
              <p className="label-mono mt-1.5 text-[10px] text-ink-500 dark:text-ink-400">
                {h.icon} {r.label}
              </p>
            </div>
          )
        })}
      </section>

      {/* Griglia: una card piena di colore e due pillole */}
      <section className="mb-5 grid grid-cols-2 gap-3">
        <div className="row-span-2 flex flex-col rounded-[28px] bg-accent-500 p-5 text-white">
          <p className="label-mono flex items-center justify-between">
            Serie in corso <FlameIcon className="text-lg" />
          </p>
          <p className="mt-auto pt-6 text-6xl leading-none font-light tabular-nums">
            {topNow ? formatNumber(topNow.streak.current) : '0'}
          </p>
          <p className="mt-2 truncate text-sm opacity-85">
            {topNow ? `${topNow.streak.unit} · ${topNow.habit.name}` : 'Nessuna serie attiva'}
          </p>
        </div>
        <Pill value={String(fullDays)} label={fullDays === 1 ? 'giorno pieno' : 'giorni pieni'} />
        <Pill
          value={record ? formatNumber(record.streak.best) : '0'}
          label={record ? `record · ${record.habit.name}` : 'record'}
        />
      </section>

      <section className="card mb-5 p-5">
        <SectionTitle>Andamento giornaliero</SectionTitle>
        <p className="mb-4 text-xs text-ink-500 dark:text-ink-400">Quota di abitudini previste completate ogni giorno</p>
        <div className="h-48 text-ink-900 dark:text-ink-100">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={TICK} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} tick={TICK} unit="%" />
              <Tooltip
                cursor={{ fill: 'rgba(141,142,136,0.12)' }}
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as (typeof trend)[number] | undefined
                  if (!active || !p) return null
                  return (
                    <ChartTip title={formatShort(p.date)}>
                      {p.value === null ? 'Nessun dato' : `${p.value}% completato`}
                    </ChartTip>
                  )
                }}
              />
              <Bar
                dataKey="value"
                fill="currentColor"
                radius={[8, 8, 8, 8]}
                maxBarSize={period === 'week' ? 18 : 9}
                isAnimationActive={!reduceMotion()}
              >
                {trend.map((t) => (
                  <Cell key={t.date} fill={t.date === today ? ACCENT : 'currentColor'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <HabitChart habits={habits} app={app} from={from} to={to} today={today} period={period} />

      <SectionTitle>Per abitudine</SectionTitle>
      <section className="grid grid-cols-2 gap-3">
        {habits.map((h) => {
          const r = completionRate(app, h, from, to, today)
          const rate = ratio(r)
          const streak = streaks.find((s) => s.habit.id === h.id)!.streak
          return (
            <div key={h.id} className="card min-w-0 p-3.5 sm:p-5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="label-mono truncate text-ink-600 dark:text-ink-300">
                  {h.icon} {h.name}
                </p>
                <span className="font-mono text-[11px] text-ink-500 tabular-nums dark:text-ink-400">
                  {r.done}/{r.total}
                </span>
              </div>
              <Gauge value={rate ?? 0} color={h.color} />
              <div className="flex items-end justify-between gap-2">
                <p className="text-3xl leading-none font-light tabular-nums sm:text-4xl">
                  {rate === null ? '—' : Math.round(rate * 100)}
                  <span className="ml-0.5 text-base font-semibold">%</span>
                </p>
                <p className="flex shrink-0 items-center gap-0.5 font-mono text-[10px] text-ink-500 dark:text-ink-400">
                  <FlameIcon className="text-accent-500" />
                  {streak.current}
                </p>
              </div>
            </div>
          )
        })}
      </section>
    </>
  )
}

/** Valore medio di un'abitudine nel periodo, scelto in base al tipo. */
function readoutOf(habit: Habit, s: ReturnType<typeof amountSummary>): { value: string; unit: string; label: string } | null {
  const avg = s.average
  switch (habit.type) {
    case 'sonno':
      return { value: avg === null ? '—' : formatOneDecimal(avg), unit: 'h', label: 'sonno medio' }
    case 'quantita':
      return {
        value: avg === null ? '—' : formatOneDecimal(avg),
        unit: habit.unit ?? '',
        label: `${habit.name.toLowerCase()} / giorno`,
      }
    case 'durata':
      return s.total >= 60
        ? { value: formatOneDecimal(s.total / 60), unit: 'h', label: `${habit.name.toLowerCase()} totale` }
        : { value: formatNumber(s.total), unit: 'min', label: `${habit.name.toLowerCase()} totale` }
    case 'pasti':
      return {
        value: avg === null ? '—' : formatOneDecimal(avg),
        unit: `/${habit.target ?? 4}`,
        label: 'pasti al giorno',
      }
    default:
      return null
  }
}

function Pill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col justify-center rounded-full bg-paper px-5 py-4 dark:bg-ink-900">
      <p className="text-3xl leading-none font-light tabular-nums">{value}</p>
      <p className="label-mono mt-1 truncate text-[10px] text-ink-500 dark:text-ink-400">{label}</p>
    </div>
  )
}

/** Torta piena: quota completata in arancio. */
function Pie({ value }: { value: number }) {
  return (
    <span
      className="size-20 shrink-0 rounded-full sm:size-24"
      role="img"
      aria-label={`${Math.round(value * 100)}% completato`}
      style={{
        background: `conic-gradient(var(--color-accent-500) ${value * 360}deg, var(--color-accent-200) 0)`,
      }}
    />
  )
}

/** Semicerchio a lancetta, come uno strumento di misura. */
function Gauge({ value, color }: { value: number; color: string }) {
  const v = Math.min(1, Math.max(0, value))
  const cx = 70
  const cy = 64
  const at = (t: number, r: number) => {
    const a = Math.PI * (1 - t)
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)] as const
  }
  const [nx, ny] = at(v, 46)
  return (
    <svg viewBox="0 0 140 70" className="my-2 h-auto w-full max-w-56" aria-hidden="true">
      <path d={`M ${cx - 54} ${cy} A 54 54 0 0 1 ${cx + 54} ${cy}`} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1.2} />
      {Array.from({ length: 21 }, (_, i) => {
        const t = i / 20
        const major = i % 5 === 0
        const [x1, y1] = at(t, major ? 46 : 49)
        const [x2, y2] = at(t, 54)
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity={t <= v ? 0.9 : 0.3} strokeWidth={major ? 1.4 : 1} />
        )
      })}
      <line x1={0} y1={cy} x2={140} y2={cy} stroke="currentColor" strokeOpacity={0.6} strokeWidth={1} />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={3.5} fill={color} />
    </svg>
  )
}

/** Valore registrato giorno per giorno per l'abitudine scelta, con la linea dell'obiettivo. */
function HabitChart({
  habits,
  app,
  from,
  to,
  today,
  period,
}: {
  habits: Habit[]
  app: AppData
  from: ISODate
  to: ISODate
  today: ISODate
  period: Period
}) {
  const candidates = habits.filter((h) => h.type !== 'check')
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => (candidates.find((h) => h.type === 'sonno') ?? candidates[0])?.id,
  )
  const habit = candidates.find((h) => h.id === selectedId) ?? candidates[0]
  if (!habit) return null

  const unit = { quantita: habit.unit ?? '', durata: 'min', sonno: 'h', pasti: 'pasti', check: '' }[habit.type]
  const target = habit.type === 'pasti' ? (habit.target ?? 4) : habit.target
  const fmt = (v: number) => (habit.type === 'sonno' ? formatMinutes(v * 60) : `${formatNumber(v)} ${unit}`)

  const series = eachDay(from, to).map((d) => {
    const e = getEntry(app, habit.id, d)
    const value = d > today || !e || e.na || !hasData(e.data) ? null : Math.round(amountOf(e.data) * 100) / 100
    return { date: d, label: period === 'week' ? formatShort(d).split(' ')[0] : String(Number(d.slice(8))), value }
  })

  return (
    <section className="card mb-6 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <SectionTitle className="mb-0">Dettaglio</SectionTitle>
        <select
          className="field w-auto rounded-full py-1.5"
          value={habit.id}
          onChange={(e) => setSelectedId(e.target.value)}
          aria-label="Abitudine da mostrare"
        >
          {candidates.map((h) => (
            <option key={h.id} value={h.id}>
              {h.icon} {h.name}
            </option>
          ))}
        </select>
      </div>
      <div className="h-48 text-ink-900 dark:text-ink-100">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={TICK} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} tick={TICK} allowDecimals={habit.type === 'quantita'} />
            <Tooltip
              cursor={{ fill: 'rgba(141,142,136,0.12)' }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as (typeof series)[number] | undefined
                if (!active || !p) return null
                return <ChartTip title={formatShort(p.date)}>{p.value === null ? 'Nessun dato' : fmt(p.value)}</ChartTip>
              }}
            />
            {target ? <ReferenceLine y={target} stroke={ACCENT} strokeDasharray="3 4" ifOverflow="extendDomain" /> : null}
            <Bar
              dataKey="value"
              fill="currentColor"
              radius={[8, 8, 8, 8]}
              maxBarSize={period === 'week' ? 18 : 9}
              isAnimationActive={!reduceMotion()}
            >
              {series.map((p) => (
                <Cell key={p.date} fill={target && p.value !== null && p.value >= target ? ACCENT : 'currentColor'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {target ? (
        <p className="mt-3 flex items-center gap-2 font-mono text-[11px] text-ink-500 dark:text-ink-400">
          <span className="w-5 border-t-2 border-dashed border-accent-500" />
          Obiettivo: {fmt(target)} · <span className="text-accent-600 dark:text-accent-400">arancio</span> = raggiunto
        </p>
      ) : null}
    </section>
  )
}

function ChartTip({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={cx('rounded-2xl bg-ink-900 px-3 py-2 font-mono text-[11px] text-white shadow-lg dark:bg-ink-50 dark:text-ink-900')}>
      <p className="font-medium">{title}</p>
      <p className="opacity-75">{children}</p>
    </div>
  )
}
