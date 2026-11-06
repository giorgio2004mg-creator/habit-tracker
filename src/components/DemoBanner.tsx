import { isDemo } from '../state/auth'

/** Ricorda che i dati sono di esempio, con l'uscita verso l'app vera. */
export function DemoBanner() {
  if (!isDemo()) return null
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-[22px] bg-paper px-4 py-2.5 text-sm text-ink-600 dark:bg-ink-900 dark:text-ink-300">
      <span className="flex items-center gap-2">
        <span className="size-2 shrink-0 rounded-full bg-accent-500" aria-hidden="true" />
        Modalità demo: i dati sono di esempio e non vengono salvati online.</span>
      <a href="/" className="font-semibold text-ink-900 underline underline-offset-2 dark:text-ink-50">
        Esci dalla demo
      </a>
    </div>
  )
}
