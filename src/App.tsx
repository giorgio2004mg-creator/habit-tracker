import { type ComponentType, Suspense, lazy } from 'react'
import { Layout } from './components/Layout'
import { CalendarPage } from './pages/CalendarPage'
import { HabitsPage } from './pages/HabitsPage'
import { SettingsPage } from './pages/SettingsPage'
import { TodayPage } from './pages/TodayPage'
import { useStore } from './state/store'
import { type Route, useRoute } from './state/useRoute'
import { useApplyTheme } from './state/useTheme'

// Recharts pesa: le statistiche si scaricano dopo l'avvio, senza rallentarlo.
// Il precaricamento le mette anche nella cache offline del service worker.
const loadStats = () => import('./pages/StatsPage').then((m) => ({ default: m.StatsPage }))
const StatsPage = lazy(loadStats)
window.addEventListener('load', () => setTimeout(loadStats, 2000), { once: true })

const PAGES: Record<Route, ComponentType> = {
  oggi: TodayPage,
  calendario: CalendarPage,
  statistiche: StatsPage,
  abitudini: HabitsPage,
  impostazioni: SettingsPage,
}

export function App() {
  const route = useRoute()
  const { data } = useStore()
  useApplyTheme(data.settings.theme)
  const Page = PAGES[route]

  return (
    <Layout route={route}>
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    </Layout>
  )
}
