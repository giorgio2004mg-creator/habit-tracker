import { useState } from 'react'
import { HabitForm, TYPE_LABELS } from '../components/HabitForm'
import { ArchiveIcon, ArrowDown, ArrowUp, PencilIcon, PlusIcon, RestoreIcon, TrashIcon } from '../components/icons'
import { Button, HabitIcon, IconButton, PageHeader, SectionTitle } from '../components/ui'
import type { Habit } from '../types'
import { frequencyLabel } from '../lib/schedule'
import { useStore } from '../state/store'

export function HabitsPage() {
  const store = useStore()
  const [editing, setEditing] = useState<Habit | 'new' | null>(null)
  const archived = store.data.habits.filter((h) => h.archived)

  return (
    <>
      <PageHeader
        title="Abitudini"
        subtitle={`${store.habits.length} attive`}
        actions={
          <span className="hidden md:block">
            <Button variant="primary" onClick={() => setEditing('new')}>
              <PlusIcon /> Nuova abitudine
            </Button>
          </span>
        }
      />

      <ul className="space-y-2.5">
        {store.habits.map((h, i) => (
          <li key={h.id} className="flex items-center gap-3 rounded-[32px] bg-paper py-2.5 pr-2 pl-3 dark:bg-ink-900">
            <span className="hidden w-5 shrink-0 text-center font-mono text-[11px] text-ink-400 sm:inline">{String(i + 1).padStart(2, '0')}</span>
            <HabitIcon icon={h.icon} color={h.color} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-base font-medium">
                {h.name}
                {h.category && (
                  <span
                    className="hidden rounded-full px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase sm:inline"
                    style={{ backgroundColor: `${h.color}1f`, color: h.color }}
                  >
                    {h.category}
                  </span>
                )}
              </p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-ink-500 dark:text-ink-400">
                {TYPE_LABELS[h.type].label} · {frequencyLabel(h.frequency)}
              </p>
            </div>
            <div className="-mr-1 flex shrink-0 items-center [&>button]:size-8 sm:[&>button]:size-9">
              <IconButton label="Sposta su" onClick={() => store.moveHabit(h.id, -1)} disabled={i === 0}>
                <ArrowUp />
              </IconButton>
              <IconButton
                label="Sposta giù"
                onClick={() => store.moveHabit(h.id, 1)}
                disabled={i === store.habits.length - 1}
              >
                <ArrowDown />
              </IconButton>
              <IconButton label="Modifica" onClick={() => setEditing(h)}>
                <PencilIcon />
              </IconButton>
              <IconButton label="Archivia" onClick={() => store.setArchived(h.id, true)}>
                <ArchiveIcon />
              </IconButton>
            </div>
          </li>
        ))}
        {store.habits.length === 0 && (
          <li className="card p-6 text-center text-sm text-ink-500 dark:text-ink-400">
            Nessuna abitudine attiva.
          </li>
        )}
      </ul>

      {archived.length > 0 && (
        <section className="mt-8">
          <SectionTitle>Archiviate</SectionTitle>
          <p className="mb-3 text-xs text-ink-500 dark:text-ink-400">
            Non compaiono in Oggi e nelle statistiche, ma i dati restano salvati.
          </p>
          <ul className="space-y-2">
            {archived.map((h) => (
              <li key={h.id} className="flex items-center gap-3 rounded-[32px] border border-dashed border-ink-300 py-2.5 pr-2 pl-3 opacity-80 dark:border-white/15">
                <HabitIcon icon={h.icon} color={h.color} />
                <span className="min-w-0 flex-1 truncate font-medium">{h.name}</span>
                <IconButton label="Ripristina" onClick={() => store.setArchived(h.id, false)}>
                  <RestoreIcon />
                </IconButton>
                <IconButton
                  label="Elimina definitivamente"
                  className="hover:text-red-600"
                  onClick={() => {
                    if (confirm(`Eliminare "${h.name}" e tutti i suoi dati? L'operazione non si può annullare.`)) {
                      store.deleteHabit(h.id)
                    }
                  }}
                >
                  <TrashIcon />
                </IconButton>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Pulsante grande sopra la barra (mobile) */}
      <button
        type="button"
        onClick={() => setEditing('new')}
        className="fixed bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.75rem)] left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent-500 px-6 py-3.5 text-sm font-medium text-white shadow-[0_10px_30px_-10px_rgb(255_79_31/0.7)] md:hidden"
      >
        <PlusIcon className="text-lg" /> Nuova abitudine
      </button>

      {editing && <HabitForm habit={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  )
}
