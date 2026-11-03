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
          <Button variant="primary" onClick={() => setEditing('new')}>
            <PlusIcon /> Nuova
          </Button>
        }
      />

      <ul className="space-y-2">
        {store.habits.map((h, i) => (
          <li key={h.id} className="card flex items-center gap-3 p-3">
            <HabitIcon icon={h.icon} color={h.color} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate font-medium">
                {h.name}
                {h.category && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: `${h.color}1f`, color: h.color }}
                  >
                    {h.category}
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {TYPE_LABELS[h.type].label} · {frequencyLabel(h.frequency)}
              </p>
            </div>
            <div className="flex items-center">
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
          <li className="card p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Nessuna abitudine attiva.
          </li>
        )}
      </ul>

      {archived.length > 0 && (
        <section className="mt-8">
          <SectionTitle>Archiviate</SectionTitle>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Non compaiono in Oggi e nelle statistiche, ma i dati restano salvati.
          </p>
          <ul className="space-y-2">
            {archived.map((h) => (
              <li key={h.id} className="card flex items-center gap-3 p-3 opacity-75">
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

      {editing && <HabitForm habit={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  )
}
