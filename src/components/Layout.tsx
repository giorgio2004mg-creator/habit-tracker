import type { ComponentType, ReactNode, SVGProps } from 'react'
import type { Route } from '../state/useRoute'
import { CalendarIcon, ChartIcon, GearIcon, ListIcon, SunIcon } from './icons'
import { DemoBanner } from './DemoBanner'
import { OfflineBanner } from './OfflineBanner'
import { cx } from './ui'

const NAV: { route: Route; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { route: 'oggi', label: 'Oggi', Icon: SunIcon },
  { route: 'calendario', label: 'Calendario', Icon: CalendarIcon },
  { route: 'statistiche', label: 'Statistiche', Icon: ChartIcon },
  { route: 'abitudini', label: 'Abitudini', Icon: ListIcon },
  { route: 'impostazioni', label: 'Impostazioni', Icon: GearIcon },
]

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  return (
    <div className="md:flex">
      {/* Barra laterale (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col px-4 py-7 md:flex">
        <div className="mb-10 flex items-center gap-3 px-2">
          <img src="/favicon.svg" alt="" className="size-10" />
          <span className="font-serif text-2xl leading-none italic">Abitudini</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ route: r, label, Icon }) => (
            <a
              key={r}
              href={`#/${r}`}
              aria-current={route === r ? 'page' : undefined}
              className={cx(
                'flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition',
                route === r
                  ? 'bg-ink-900 text-white dark:bg-ink-50 dark:text-ink-900'
                  : 'text-ink-600 hover:bg-ink-900/5 dark:text-ink-400 dark:hover:bg-white/5',
              )}
            >
              <Icon className={cx('text-xl', route === r && 'text-accent-500')} />
              {label}
            </a>
          ))}
        </nav>
        <p className="label-mono mt-auto px-2 text-ink-400">~ giorno per giorno</p>
      </aside>

      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-32 md:px-8 md:pt-10 md:pb-12">
        <DemoBanner />
        <OfflineBanner />
        {children}
      </main>

      {/* Barra in basso (mobile): scura e sospesa */}
      <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 rounded-[26px] bg-ink-900 px-1 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.5)] md:hidden dark:bg-ink-800">
        <div className="grid grid-cols-5">
          {NAV.map(({ route: r, label, Icon }) => (
            <a
              key={r}
              href={`#/${r}`}
              aria-current={route === r ? 'page' : undefined}
              className={cx(
                'flex flex-col items-center gap-1 py-2.5 font-mono text-[8.5px] uppercase transition',
                route === r ? 'text-accent-500' : 'text-ink-400',
              )}
            >
              <Icon className="text-[22px]" />
              {label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  )
}
