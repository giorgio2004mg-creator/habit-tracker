import { isDemo } from '../state/auth'

/** Ricorda che i dati sono di esempio, con l'uscita verso l'app vera. */
export function DemoBanner() {
  if (!isDemo()) return null
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
      <span>Modalità demo: i dati sono di esempio e non vengono salvati online.</span>
      <a href="/" className="font-semibold underline underline-offset-2">
        Esci dalla demo
      </a>
    </div>
  )
}
