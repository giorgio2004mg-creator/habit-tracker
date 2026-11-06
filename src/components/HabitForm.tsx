import { type CSSProperties, type FormEvent, useState } from 'react'
import type { Frequency, Habit, HabitType, Weekday } from '../types'
import { WEEKDAY_SHORT } from '../lib/dates'
import { type HabitDraft, useStore } from '../state/store'
import { Modal } from './Modal'
import { Button, Field, NumberInput, Segmented, cx } from './ui'

export const HABIT_COLORS = [
  '#10b981', '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#64748b',
]

const ICONS = [
  '💧', '🏋️', '📚', '😴', '🍽️', '🏃', '🚴', '🧘', '🚶', '🥗', '🍎', '💊',
  '🧠', '✍️', '🎸', '🎨', '💻', '🌱', '🧹', '💰', '📵', '☀️', '🛏️', '✅',
]

export const TYPE_LABELS: Record<HabitType, { label: string; description: string }> = {
  check: { label: 'Fatto / non fatto', description: 'Segni se l’hai fatto, con una nota breve' },
  quantita: { label: 'Quantità', description: 'Un numero con unità e obiettivo (es. litri d’acqua)' },
  durata: { label: 'Durata', description: 'Minuti e argomento (es. studio)' },
  sonno: { label: 'Sonno', description: 'Ora a letto e sveglia, ore calcolate in automatico' },
  pasti: { label: 'Pasti', description: 'Colazione, pranzo, merenda e cena' },
}

const TYPE_DEFAULTS: Record<HabitType, Partial<HabitDraft>> = {
  check: {},
  quantita: { target: 2, unit: 'L', step: 0.25 },
  durata: { target: undefined },
  sonno: { target: 8 },
  pasti: { target: 4 },
}

const EMPTY: HabitDraft = {
  name: '',
  category: '',
  color: HABIT_COLORS[0],
  icon: '✅',
  type: 'check',
  frequency: { kind: 'daily' },
}

type FreqKind = Frequency['kind']

export function HabitForm({ habit, onClose }: { habit?: Habit; onClose: () => void }) {
  const store = useStore()
  const [draft, setDraft] = useState<HabitDraft>(() => (habit ? { ...habit } : EMPTY))
  const set = (patch: Partial<HabitDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const categories = [...new Set(store.data.habits.map((h) => h.category).filter(Boolean))].sort()

  const setFreqKind = (kind: FreqKind) => {
    if (kind === draft.frequency.kind) return
    set({
      frequency:
        kind === 'daily'
          ? { kind }
          : kind === 'weekdays'
            ? { kind, days: [0, 2, 4] }
            : { kind, times: 3 },
    })
  }

  const toggleDay = (day: Weekday) => {
    if (draft.frequency.kind !== 'weekdays') return
    const days = draft.frequency.days
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort()
    set({ frequency: { kind: 'weekdays', days: next as Weekday[] } })
  }

  const freqValid = draft.frequency.kind !== 'weekdays' || draft.frequency.days.length > 0
  const valid = draft.name.trim() !== '' && freqValid

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!valid) return
    const clean: HabitDraft = {
      ...draft,
      name: draft.name.trim(),
      category: draft.category.trim(),
      unit: draft.type === 'quantita' ? draft.unit?.trim() : undefined,
      step: draft.type === 'quantita' ? draft.step : undefined,
      target: draft.type === 'check' ? undefined : draft.target,
    }
    if (habit) store.updateHabit({ ...habit, ...clean })
    else store.createHabit(clean)
    onClose()
  }

  return (
    <Modal
      title={habit ? 'Modifica abitudine' : 'Nuova abitudine'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button variant="primary" onClick={() => submit()} disabled={!valid}>
            {habit ? 'Salva' : 'Crea'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="flex gap-3">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
            style={{ backgroundColor: `${draft.color}22` }}
          >
            {draft.icon}
          </span>
          <div className="flex-1">
            <Field label="Nome">
              <input
                className="field"
                value={draft.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Es. Meditazione"
                maxLength={40}
                autoFocus={!habit}
                required
              />
            </Field>
          </div>
        </div>

        <Field label="Categoria">
          <input
            className="field"
            value={draft.category}
            onChange={(e) => set({ category: e.target.value })}
            placeholder="Es. Salute"
            list="habit-categories"
            maxLength={30}
          />
          <datalist id="habit-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">Colore</span>
          <div className="flex flex-wrap gap-2">
            {HABIT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set({ color: c })}
                aria-label={`Colore ${c}`}
                aria-pressed={draft.color === c}
                className={cx(
                  'size-8 rounded-full transition',
                  draft.color === c && 'ring-2 ring-offset-2 ring-offset-ink-50 dark:ring-offset-ink-950',
                )}
                style={{ backgroundColor: c, '--tw-ring-color': c } as CSSProperties}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">Icona</span>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => set({ icon: i })}
                aria-pressed={draft.icon === i}
                className={cx(
                  'flex aspect-square items-center justify-center rounded-xl text-xl transition',
                  draft.icon === i ? 'bg-ink-200 dark:bg-ink-700' : 'hover:bg-ink-100 dark:hover:bg-ink-800',
                )}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <Field label="Tipo" hint={habit ? 'Il tipo non si può cambiare dopo la creazione.' : TYPE_LABELS[draft.type].description}>
          <select
            className="field"
            value={draft.type}
            disabled={!!habit}
            onChange={(e) => {
              const type = e.target.value as HabitType
              set({ type, target: undefined, unit: undefined, step: undefined, ...TYPE_DEFAULTS[type] })
            }}
          >
            {(Object.keys(TYPE_LABELS) as HabitType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t].label}
              </option>
            ))}
          </select>
        </Field>

        <TypeSettings draft={draft} set={set} />

        <div className="space-y-3">
          <span className="block text-sm font-medium text-ink-700 dark:text-ink-300">Frequenza</span>
          <Segmented
            value={draft.frequency.kind}
            onChange={setFreqKind}
            options={[
              { value: 'daily', label: 'Ogni giorno' },
              { value: 'weekdays', label: 'Giorni' },
              { value: 'weekly', label: 'X / sett.' },
            ]}
          />
          {draft.frequency.kind === 'weekdays' && (
            <div className="flex gap-1.5">
              {WEEKDAY_SHORT.map((label, i) => {
                const active = draft.frequency.kind === 'weekdays' && draft.frequency.days.includes(i as Weekday)
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(i as Weekday)}
                    aria-pressed={active}
                    className={cx(
                      'flex-1 rounded-lg py-2 text-xs font-semibold capitalize transition',
                      active ? 'text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
                    )}
                    style={active ? { backgroundColor: draft.color } : undefined}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}
          {draft.frequency.kind === 'weekly' && (
            <Segmented
              value={draft.frequency.times}
              onChange={(times) => set({ frequency: { kind: 'weekly', times } })}
              options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: `${n}×` }))}
            />
          )}
          {!freqValid && <p className="text-xs text-red-600">Scegli almeno un giorno.</p>}
        </div>
      </form>
    </Modal>
  )
}

function TypeSettings({ draft, set }: { draft: HabitDraft; set: (p: Partial<HabitDraft>) => void }) {
  switch (draft.type) {
    case 'quantita':
      return (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Unità">
            <input
              className="field"
              value={draft.unit ?? ''}
              onChange={(e) => set({ unit: e.target.value })}
              placeholder="L"
              maxLength={12}
            />
          </Field>
          <Field label="Obiettivo">
            <NumberInput value={draft.target} onCommit={(target) => set({ target })} placeholder="2" />
          </Field>
          <Field label="Pulsante +">
            <NumberInput value={draft.step} onCommit={(step) => set({ step })} placeholder="1" />
          </Field>
        </div>
      )
    case 'durata':
      return (
        <Field label="Obiettivo giornaliero (minuti)" hint="Facoltativo: senza obiettivo basta registrare qualche minuto.">
          <NumberInput value={draft.target} onCommit={(target) => set({ target: target || undefined })} placeholder="—" />
        </Field>
      )
    case 'sonno':
      return (
        <Field label="Obiettivo (ore)">
          <NumberInput value={draft.target} onCommit={(target) => set({ target })} placeholder="8" />
        </Field>
      )
    case 'pasti':
      return (
        <Field label="Pasti da fare per completare la giornata">
          <Segmented
            value={draft.target ?? 4}
            onChange={(target) => set({ target })}
            options={[1, 2, 3, 4].map((n) => ({ value: n, label: String(n) }))}
          />
        </Field>
      )
    default:
      return null
  }
}
