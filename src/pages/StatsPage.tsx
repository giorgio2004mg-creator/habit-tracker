import { type ReactNode, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronLeft, ChevronRight, FlameIcon } from '../components/icons'
import { HabitIcon, IconButton, PageHeader, ProgressBar, SectionTitle, Segmented, cx } from '../components/ui'
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
import { capitalize, formatMinutes, formatNumber, formatOneDecimal, formatPercent } from '../lib/format'
import { amountOf, getEntry, hasData } from '../lib/progress'
import { amountSummary, completionRate, dayCompletion, overallRate, ratio } from '../lib/stats'
import { computeStreak } from '../lib/streak'
import { useStore } from '../state/store'

type Period = 'week' | 'month'

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

  return (
    <>
      <PageHeader
        title="Statistiche"
        subtitle={capitalize(periodLabel(period, from, to))}
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
        className="mb-5"
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

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi label="Completamento" value={overall === null ? '—' : formatPercent(overall)} accent />
        {habits
          .filter((h) => h.type !== 'check')
          .map((h) => (
            <HabitKpi key={h.id} habit={h} app={app} from={from} to={to} />
          ))}
      </div>

      <section className="card mb-5 p-4">
        <SectionTitle>Andamento giornaliero</SectionTitle>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Quota di abitudini previste completate ogni giorno
        </p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap={period === 'week' ? '30%' : '15%'}>
              <CartesianGrid vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.12)' }}
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
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <HabitChart habits={habits} app={app} from={from} to={to} today={today} period={period} />

      <section className="card p-4">
        <SectionTitle>Per abitudine</SectionTitle>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {habits.map((h) => {
            const r = completionRate(app, h, from, to, today)
            const rate = ratio(r)
            const streak = computeStreak(app, h, today)
            return (
              <li key={h.id} className="flex items-center gap-3 py-3">
                <HabitIcon icon={h.icon} color={h.color} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium">{h.name}</span>
                    <span className="text-sm font-semibold tabular-nums">{rate === null ? '—' : formatPercent(rate)}</span>
                  </div>
                  <ProgressBar value={rate ?? 0} color={h.color} />
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <FlameIcon className="text-orange-500" />
                    Serie {streak.current} · record {streak.best} {streak.unit}
                    <span className="ml-auto tabular-nums">
                      {r.done}/{r.total}
                    </span>
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cx('mt-1 text-2xl font-bold tracking-tight', accent && 'text-emerald-600 dark:text-emerald-400')}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

/** Indicatore principale di un'abitudine, scelto in base al tipo. */
function HabitKpi({ habit, app, from, to }: { habit: Habit; app: AppData; from: ISODate; to: ISODate }) {
  const s = amountSummary(app, habit, from, to)
  const days = s.days === 1 ? '1 giorno' : `${s.days} giorni`
  switch (habit.type) {
    case 'sonno':
      return (
        <Kpi
          label={`${habit.icon} Media ${habit.name.toLowerCase()}`}
          value={s.average === null ? '—' : formatMinutes(s.average * 60)}
          hint={`su ${days}`}
        />
      )
    case 'quantita':
      return (
        <Kpi
          label={`${habit.icon} Media ${habit.name.toLowerCase()}`}
          value={s.average === null ? '—' : `${formatOneDecimal(s.average)} ${habit.unit ?? ''}`}
          hint={`al giorno, su ${days}`}
        />
      )
    case 'durata':
      return <Kpi label={`${habit.icon} ${habit.name} totale`} value={formatMinutes(s.total)} hint={`in ${days}`} />
    case 'pasti':
      return (
        <Kpi
          label={`${habit.icon} ${habit.name}`}
          value={s.average === null ? '—' : `${formatOneDecimal(s.average)} / 4`}
          hint="pasti fatti al giorno"
        />
      )
    default:
      return null
  }
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
    <section className="card mb-5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SectionTitle className="mb-0">Dettaglio</SectionTitle>
        <select
          className="field w-auto py-1.5"
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
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 8, right: 4, bottom: 0, left: -20 }} barCategoryGap={period === 'week' ? '30%' : '15%'}>
            <CartesianGrid vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={habit.type === 'quantita'} />
            <Tooltip
              cursor={{ fill: 'rgba(148,163,184,0.12)' }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as (typeof series)[number] | undefined
                if (!active || !p) return null
                return <ChartTip title={formatShort(p.date)}>{p.value === null ? 'Nessun dato' : fmt(p.value)}</ChartTip>
              }}
            />
            {target ? (
              <ReferenceLine
                y={target}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
            ) : null}
            <Bar dataKey="value" fill={habit.color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {target ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="w-5 border-t-2 border-dashed border-slate-400" />
          Obiettivo: {fmt(target)}
        </p>
      ) : null}
    </section>
  )
}

function ChartTip({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="text-slate-600 dark:text-slate-300">{children}</p>
    </div>
  )
}
