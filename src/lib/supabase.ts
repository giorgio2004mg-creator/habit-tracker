import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Client Supabase, o `null` se le variabili d'ambiente non sono impostate:
 * in quel caso l'app funziona solo in locale, senza login.
 */
export const supabase = url && key ? createClient(url, key) : null
