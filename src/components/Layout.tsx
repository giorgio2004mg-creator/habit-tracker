import type { ComponentType, ReactNode, SVGProps } from 'react'
import type { Route } from '../state/useRoute'
import { CalendarIcon, ChartIcon, GearIcon, ListIcon, SunIcon } from './icons'
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
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-6 md:flex dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-8 flex items-center gap-2 px-3">
          <img src="/favicon.svg" alt="" className="size-8" />
          <span className="text-lg font-bold tracking-tight">Abitudini</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ route: r, label, Icon }) => (
            <a
              key={r}
              href={`#/${r}`}
              aria-current={route === r ? 'page' : undefined}
              className={cx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                route === r
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
            >
              <Icon className="text-xl" />
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 md:px-8 md:pt-10 md:pb-12">{children}</main>

      {/* Barra in basso (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <div className="grid grid-cols-5">
          {NAV.map(({ route: r, label, Icon }) => (
            <a
              key={r}
              href={`#/${r}`}
              aria-current={route === r ? 'page' : undefined}
              className={cx(
                'flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition',
                route === r ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400',
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
