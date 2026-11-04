import { useEffect, useState } from 'react'
import { useAuth } from '../state/auth'

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

/** Avviso quando manca la connessione (solo con i dati sincronizzati). */
export function OfflineBanner() {
  const online = useOnline()
  const auth = useAuth()
  if (online || !auth) return null
  return (
    <div
      role="status"
      className="mb-4 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
    >
      Sei offline: puoi continuare a usare l'app, le modifiche verranno inviate appena torna la connessione.
    </div>
  )
}
