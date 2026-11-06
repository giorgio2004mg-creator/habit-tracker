import { type ChangeEvent, useRef, useState } from 'react'
import { DownloadIcon, UploadIcon } from '../components/icons'
import { Button, PageHeader, SectionTitle, Segmented } from '../components/ui'
import type { ThemePref } from '../types'
import { exportJson, InvalidBackupError, parseBackup } from '../storage'
import { useAuth } from '../state/auth'
import { useStore } from '../state/store'

export function SettingsPage() {
  const store = useStore()
  const auth = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const entriesCount = Object.keys(store.data.entries).length

  const download = () => {
    const blob = new Blob([exportJson(store.data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `abitudini-backup-${store.today}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ kind: 'ok', text: 'Backup scaricato.' })
  }

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = parseBackup(await file.text())
      const summary = `${data.habits.length} abitudini e ${Object.keys(data.entries).length} registrazioni`
      if (!confirm(`Importare ${summary}? I dati attuali verranno sostituiti.`)) return
      store.replaceAll(data)
      setMessage({ kind: 'ok', text: `Importati ${summary}.` })
    } catch (err) {
      const text = err instanceof InvalidBackupError ? err.message : 'Impossibile leggere il file.'
      setMessage({ kind: 'error', text })
    }
  }

  const reset = () => {
    if (confirm('Cancellare tutti i dati e ripartire dalle abitudini iniziali? Scarica prima un backup se ti serve.')) {
      store.resetAll()
      setMessage({ kind: 'ok', text: 'Dati azzerati.' })
    }
  }

  return (
    <>
      <PageHeader title="Impostazioni" />

      <div className="space-y-6">
        {auth && (
          <section className="card p-4">
            <SectionTitle>Account</SectionTitle>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 text-sm text-ink-600 dark:text-ink-400">
                Collegato come <strong className="break-all text-ink-900 dark:text-ink-100">{auth.email}</strong>
              </p>
              <Button
                onClick={() => {
                  if (confirm('Uscire dall\'account? I dati restano salvati online.')) auth.signOut()
                }}
              >
                Esci
              </Button>
            </div>
          </section>
        )}

        <section className="card p-4">
          <SectionTitle>Tema</SectionTitle>
          <Segmented<ThemePref>
            value={store.data.settings.theme}
            onChange={store.setTheme}
            options={[
              { value: 'system', label: 'Sistema' },
              { value: 'light', label: 'Chiaro' },
              { value: 'dark', label: 'Scuro' },
            ]}
          />
        </section>

        <section className="card p-4">
          <SectionTitle>Backup dei dati</SectionTitle>
          <p className="mb-4 text-sm text-ink-600 dark:text-ink-400">
            {auth
              ? `I dati sono sincronizzati con il tuo account (${store.data.habits.length} abitudini, ${entriesCount} registrazioni). Esporta un file JSON per avere una copia di sicurezza.`
              : `I dati sono salvati solo su questo dispositivo (${store.data.habits.length} abitudini, ${entriesCount} registrazioni). Esporta un file JSON per fare un backup o spostarli su un altro dispositivo.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={download}>
              <DownloadIcon /> Esporta JSON
            </Button>
            <Button onClick={() => fileInput.current?.click()}>
              <UploadIcon /> Importa JSON
            </Button>
            <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={importFile} />
          </div>
          {message && (
            <p
              role="status"
              className={
                message.kind === 'ok'
                  ? 'mt-3 text-sm text-accent-600 dark:text-accent-400'
                  : 'mt-3 text-sm text-red-600 dark:text-red-400'
              }
            >
              {message.text}
            </p>
          )}
        </section>

        <section className="card p-4">
          <SectionTitle>Zona pericolosa</SectionTitle>
          <p className="mb-3 text-sm text-ink-600 dark:text-ink-400">
            Elimina tutte le registrazioni e ripristina le abitudini iniziali.
          </p>
          <Button variant="danger" onClick={reset}>
            Cancella tutti i dati
          </Button>
        </section>

        <p className="text-center text-xs text-ink-400">Abitudini · v{__APP_VERSION__}</p>
      </div>
    </>
  )
}
