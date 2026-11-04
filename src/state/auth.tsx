import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'
import { LoginPage } from '../pages/LoginPage'
import { createLocalStorageAdapter, createOfflineAdapter, createSupabaseAdapter } from '../storage'
import { createDemoData } from '../storage/demo'
import { todayISO } from '../lib/dates'
import { supabase } from '../lib/supabase'
import { StoreProvider } from './store'

interface Auth {
  email: string
  signOut(): void
}

const AuthContext = createContext<Auth | null>(null)

/** Utente collegato, oppure `null` se l'app gira solo in locale. */
export const useAuth = () => useContext(AuthContext)

const localStorageAdapter = createLocalStorageAdapter()

/** `?demo` nell'indirizzo: dati di esempio, senza account. */
export const isDemo = () => new URLSearchParams(window.location.search).has('demo')

const DEMO_KEY = 'habit-tracker:demo'

/** Ogni apertura della demo riparte da dati freschi, che finiscono oggi. */
function createDemoAdapter() {
  localStorage.setItem(DEMO_KEY, JSON.stringify(createDemoData(todayISO())))
  return createLocalStorageAdapter(DEMO_KEY)
}

/**
 * Sceglie dove salvare i dati: demo, Supabase (dopo il login) se
 * configurato, altrimenti il dispositivo.
 */
export function DataRoot({ children }: { children: ReactNode }) {
  const [demoStorage] = useState(() => (isDemo() ? createDemoAdapter() : null))
  if (demoStorage) return <StoreProvider storage={demoStorage}>{children}</StoreProvider>
  if (!supabase) return <StoreProvider storage={localStorageAdapter}>{children}</StoreProvider>
  return <SupabaseRoot client={supabase}>{children}</SupabaseRoot>
}

function SupabaseRoot({ client, children }: { client: SupabaseClient; children: ReactNode }) {
  // undefined = sessione ancora in lettura
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    client.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = client.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [client])

  const userId = session?.user.id
  const storage = useMemo(
    () =>
      userId
        ? createOfflineAdapter(createSupabaseAdapter(client, userId), `habit-tracker:sync:${userId}`, (err) => {
            console.error(err)
            alert('Una modifica non è stata accettata dal server ed è stata scartata.')
          })
        : null,
    [client, userId],
  )

  // Tornata la connessione: invia le modifiche fatte offline
  useEffect(() => {
    if (!storage) return
    const onOnline = () => void storage.flush()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [storage])

  if (session === undefined) return null
  if (!session || !storage) return <LoginPage client={client} />

  return (
    <AuthContext.Provider value={{ email: session.user.email ?? '', signOut: () => client.auth.signOut() }}>
      <StoreProvider key={userId} storage={storage} importFrom={localStorageAdapter}>
        {children}
      </StoreProvider>
    </AuthContext.Provider>
  )
}
