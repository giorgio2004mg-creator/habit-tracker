import type { SupabaseClient } from '@supabase/supabase-js'
import { type FormEvent, useState } from 'react'
import { Button, Field } from '../components/ui'

function errorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (/rate limit|security purposes/i.test(message)) {
    return 'Troppe email di accesso richieste: riprova più tardi, oppure usa il codice di un’email ricevuta nell’ultima ora.'
  }
  if (/expired|invalid/i.test(message)) return 'Codice non valido o scaduto. Richiedi una nuova email.'
  return message
}

/**
 * App aggiunta alla schermata Home: ha uno spazio separato dal browser,
 * quindi il link dell'email (che si apre nel browser) non le fa fare l'accesso.
 */
const installed =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/** Accesso senza password: link o codice via email. */
export function LoginPage({ client }: { client: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const sendEmail = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) throw error
      setSent(true)
    })
  }

  const verifyCode = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      const { error } = await client.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
      if (error) throw error
    })
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/favicon.svg" alt="" className="mx-auto mb-4 size-14" />
          <h1 className="text-2xl font-bold tracking-tight">Abitudini</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Accedi per ritrovare i tuoi dati su ogni dispositivo.
          </p>
        </div>

        <div className="card p-5">
          {!sent ? (
            <form onSubmit={sendEmail} className="space-y-4">
              <Field label="Email">
                <input
                  type="email"
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@esempio.it"
                  autoComplete="email"
                  required
                  autoFocus
                />
              </Field>
              <Button type="submit" variant="primary" className="w-full" disabled={busy}>
                {busy ? 'Invio…' : 'Inviami il link di accesso'}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                disabled={!email.includes('@')}
                onClick={() => {
                  setSent(true)
                  setError(null)
                }}
              >
                Ho già un codice
              </Button>
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">Niente password da ricordare.</p>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {installed ? (
                  <>
                    Scrivi qui il codice che trovi nell'email inviata a <strong>{email}</strong>. Non usare il link:
                    si aprirebbe nel browser e l'accesso non arriverebbe a questa app.
                  </>
                ) : (
                  <>
                    Scrivi il codice che trovi nell'email inviata a <strong>{email}</strong>, oppure apri il link
                    dell'email da questo dispositivo.
                  </>
                )}
              </p>
              <Field label="Codice">
                <input
                  className="field text-center text-lg tracking-[0.3em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={10}
                  placeholder="000000"
                />
              </Field>
              <Button type="submit" variant="primary" className="w-full" disabled={busy || code.length < 6}>
                {busy ? 'Verifica…' : 'Accedi'}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setSent(false)
                  setCode('')
                  setError(null)
                }}
              >
                Usa un'altra email
              </Button>
            </form>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Vuoi solo dare un'occhiata?{' '}
          <a href="/?demo#/oggi" className="font-semibold text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400">
            Prova la demo senza account
          </a>
        </p>
      </div>
    </main>
  )
}
