import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'
import { LoginPage } from '../pages/LoginPage'
import { createLocalStorageAdapter, createSupabaseAdapter } from '../storage'
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

/**
 * Sceglie dove salvare i dati: Supabase (dopo il login) se configurato,
 * altrimenti il dispositivo.
 */
export function DataRoot({ children }: { children: ReactNode }) {
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
  const storage = useMemo(() => (userId ? createSupabaseAdapter(client, userId) : null), [client, userId])

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
