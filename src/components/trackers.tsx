import { useMemo, useState } from 'react'
import { type EntryData, type Habit, MEAL_SLOTS, type MealLog, type MealSlot, type Portion } from '../types'
import { formatMinutes, formatNumber } from '../lib/format'
import { progressOf } from '../lib/progress'
import { sleepMinutes } from '../lib/sleep'
import { useStore } from '../state/store'
import { CheckIcon, ChevronDown, MinusIcon, PlusIcon, XIcon } from './icons'
import { Button, CommitInput, IconButton, NumberInput, ProgressBar, Segmented, cx } from './ui'

export interface TrackerProps<T extends EntryData['type']> {
  habit: Habit
  data: Extract<EntryData, { type: T }> | undefined
  onChange: (data: EntryData | undefined) => void
}

const round = (n: number) => Math.round(n * 1000) / 1000

export function CheckTracker({ habit, data, onChange }: TrackerProps<'check'>) {
  const done = data?.done ?? false
  const update = (next: { done: boolean; note?: string }) =>
    onChange(next.done || next.note ? { type: 'check', ...next } : undefined)

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={() => update({ done: !done, note: data?.note })}
        aria-pressed={done}
        className={cx(
          'inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition',
          done
            ? 'text-white'
            : 'bg-ink-900/[0.06] text-ink-700 hover:bg-ink-900/10 dark:bg-white/[0.06] dark:text-ink-200 dark:hover:bg-white/10',
        )}
        style={done ? { backgroundColor: habit.color, boxShadow: `0 4px 18px -4px ${habit.color}aa` } : undefined}
      >
        <CheckIcon className="text-base" />
        {done ? 'Fatto' : 'Segna come fatto'}
      </button>
      <CommitInput
        value={data?.note ?? ''}
        onCommit={(note) => update({ done, note: note.trim() || undefined })}
        placeholder="Nota breve (facoltativa)"
        maxLength={140}
      />
    </div>
  )
}

export function QuantityTracker({ habit, data, onChange }: TrackerProps<'quantita'>) {
  const value = data?.value ?? 0
  const step = habit.step || 1
  const unit = habit.unit ?? ''
  const set = (v: number | undefined) => onChange(v && v > 0 ? { type: 'quantita', value: round(v) } : undefined)

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between text-sm">
        <span>
          <span className="text-[44px] leading-none font-light tracking-tight tabular-nums" style={{ color: habit.color }}>
            {formatNumber(value)}
          </span>
          <span className="font-mono text-sm text-ink-500 dark:text-ink-400">
            {habit.target ? ` / ${formatNumber(habit.target)}` : ''} {unit}
          </span>
        </span>
      </div>
      {habit.target ? <ProgressBar value={progressOf(habit, data)} color={habit.color} glow /> : null}
      <div className="flex items-center gap-2">
        <IconButton
          label={`Togli ${formatNumber(step)} ${unit}`}
          onClick={() => set(value - step)}
          disabled={value <= 0}
          className="bg-ink-900/[0.06] dark:bg-white/[0.06]"
        >
          <MinusIcon />
        </IconButton>
        <NumberInput
          value={value || undefined}
          onCommit={set}
          className="w-20 text-center"
          aria-label={`Quantità (${unit})`}
          placeholder="0"
        />
        <Button
          variant="primary"
          className="flex-1 py-2.5"
          onClick={() => set(value + step)}
          style={{ backgroundColor: habit.color, boxShadow: `0 4px 18px -6px ${habit.color}aa` }}
        >
          <PlusIcon />
          {formatNumber(step)} {unit}
        </Button>
      </div>
    </div>
  )
}

export function DurationTracker({ habit, data, onChange }: TrackerProps<'durata'>) {
  const { data: app } = useStore()
  const minutes = data?.minutes ?? 0
  const set = (next: { minutes: number; topic?: string }) =>
    onChange(next.minutes > 0 || next.topic ? { type: 'durata', ...next } : undefined)

  const topics = useMemo(() => {
    const all = new Set<string>()
    for (const e of Object.values(app.entries)) {
      if (e.habitId === habit.id && e.data?.type === 'durata' && e.data.topic) all.add(e.data.topic)
    }
    return [...all].sort()
  }, [app.entries, habit.id])
  const listId = `topics-${habit.id}`

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <NumberInput
            value={minutes || undefined}
            onCommit={(m) => set({ minutes: Math.round(m ?? 0), topic: data?.topic })}
            className="w-20 text-center"
            aria-label="Minuti"
            placeholder="0"
          />
          <span className="text-sm text-ink-500 dark:text-ink-400">min</span>
        </div>
        <div className="flex gap-1.5">
          {[15, 30, 60].map((m) => (
            <Button key={m} onClick={() => set({ minutes: minutes + m, topic: data?.topic })} className="px-2.5">
              +{m}
            </Button>
          ))}
        </div>
        {minutes > 0 && (
          <span className="ml-auto text-sm text-ink-400 dark:text-ink-500">
            <span className="text-2xl font-light tabular-nums" style={{ color: habit.color }}>
              {formatMinutes(minutes)}
            </span>
            {habit.target ? ` / ${formatMinutes(habit.target)}` : ''}
          </span>
        )}
      </div>
      {habit.target ? <ProgressBar value={progressOf(habit, data)} color={habit.color} glow /> : null}
      <CommitInput
        value={data?.topic ?? ''}
        onCommit={(topic) => set({ minutes, topic: topic.trim() || undefined })}
        placeholder="Argomento (es. Claude Code)"
        list={listId}
        maxLength={80}
      />
      <datalist id={listId}>
        {topics.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  )
}

export function SleepTracker({ habit, data, onChange }: TrackerProps<'sonno'>) {
  const minutes = sleepMinutes(data?.bedtime, data?.wake)
  const set = (patch: { bedtime?: string; wake?: string }) => {
    const next = { bedtime: data?.bedtime, wake: data?.wake, ...patch }
    onChange(next.bedtime || next.wake ? { type: 'sonno', ...next } : undefined)
  }
  const target = habit.target ?? 8

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-ink-500 dark:text-ink-400">A letto (sera prima)</span>
          <input
            type="time"
            className="field"
            value={data?.bedtime ?? ''}
            onChange={(e) => set({ bedtime: e.target.value || undefined })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-ink-500 dark:text-ink-400">Sveglia</span>
          <input
            type="time"
            className="field"
            value={data?.wake ?? ''}
            onChange={(e) => set({ wake: e.target.value || undefined })}
          />
        </label>
      </div>
      {minutes !== null && (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-2xl font-light tabular-nums" style={{ color: habit.color }}>
              {formatMinutes(minutes)}
            </span>
            <span className="text-ink-500 dark:text-ink-400">obiettivo {formatNumber(target)} h</span>
          </div>
          <ProgressBar value={progressOf(habit, data)} color={habit.color} glow />
        </div>
      )}
    </div>
  )
}

const MEAL_LABELS: Record<MealSlot, string> = {
  colazione: 'Colazione',
  pranzo: 'Pranzo',
  merenda: 'Merenda',
  cena: 'Cena',
}

const PORTIONS: { value: Portion; label: string }[] = [
  { value: 'leggero', label: 'Leggero' },
  { value: 'normale', label: 'Normale' },
  { value: 'abbondante', label: 'Abbondante' },
]

export function MealsTracker({ habit, data, onChange }: TrackerProps<'pasti'>) {
  const meals = data?.meals ?? {}
  const [open, setOpen] = useState<MealSlot | null>(null)

  const setSlot = (slot: MealSlot, log: MealLog | undefined) => {
    const next = { ...meals }
    if (log) next[slot] = log
    else delete next[slot]
    onChange(Object.keys(next).length ? { type: 'pasti', meals: next } : undefined)
  }

  return (
    <ul className="divide-y divide-ink-900/[0.07] dark:divide-white/[0.06]">
      {MEAL_SLOTS.map((slot) => {
        const log = meals[slot]
        const expanded = open === slot && !!log
        const toggleStatus = (status: MealLog['status']) =>
          setSlot(slot, log?.status === status ? undefined : { ...log, status })
        return (
          <li key={slot} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1 text-left text-sm font-medium disabled:cursor-default"
                onClick={() => setOpen(expanded ? null : slot)}
                disabled={!log}
                aria-expanded={expanded}
              >
                <span>{MEAL_LABELS[slot]}</span>
                {log && (
                  <>
                    <ChevronDown className={cx('shrink-0 text-ink-400 transition', expanded && 'rotate-180')} />
                    <span className="truncate text-xs font-normal text-ink-500 dark:text-ink-400">
                      {[log.food, log.portion].filter(Boolean).join(' · ')}
                    </span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => toggleStatus('fatto')}
                aria-pressed={log?.status === 'fatto'}
                className={cx(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition',
                  log?.status === 'fatto'
                    ? 'text-white'
                    : 'bg-ink-900/[0.06] text-ink-600 hover:bg-ink-900/10 dark:bg-white/[0.06] dark:text-ink-300 dark:hover:bg-white/10',
                )}
                style={log?.status === 'fatto' ? { backgroundColor: habit.color } : undefined}
              >
                <CheckIcon /> Fatto
              </button>
              <button
                type="button"
                onClick={() => toggleStatus('saltato')}
                aria-pressed={log?.status === 'saltato'}
                className={cx(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition',
                  log?.status === 'saltato'
                    ? 'bg-ink-900 text-white dark:bg-ink-50 dark:text-ink-900'
                    : 'bg-ink-900/[0.06] text-ink-600 hover:bg-ink-900/10 dark:bg-white/[0.06] dark:text-ink-300 dark:hover:bg-white/10',
                )}
              >
                <XIcon /> Saltato
              </button>
            </div>
            {expanded && log && (
              <div className="mt-2 space-y-2">
                <CommitInput
                  value={log.food ?? ''}
                  onCommit={(food) => setSlot(slot, { ...log, food: food.trim() || undefined })}
                  placeholder="Cosa ho mangiato (facoltativo)"
                  maxLength={140}
                />
                <Segmented
                  size="sm"
                  value={log.portion}
                  options={PORTIONS}
                  onChange={(portion) => setSlot(slot, { ...log, portion: log.portion === portion ? undefined : portion })}
                />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
