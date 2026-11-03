# Abitudini — Habit Tracker

App personale per tracciare abitudini, sonno e pasti. Pensata per il telefono, comoda anche su desktop.

> **Stato:** Fase 1 — app completa con dati salvati sul dispositivo ed export/import JSON.

## Funzionalità

- **Oggi** — le abitudini previste per la giornata con check-in rapido, navigazione ai giorni precedenti e riepilogo della costanza settimanale.
- **Cinque tipi di tracciamento**
  | Tipo | Cosa si registra |
  |---|---|
  | Fatto / non fatto | completamento + nota breve |
  | Quantità | numero con unità e obiettivo, pulsante di incremento rapido |
  | Durata | minuti + argomento (con suggerimenti dagli argomenti già usati) |
  | Sonno | ora a letto e sveglia, ore calcolate anche a cavallo della mezzanotte |
  | Pasti | colazione, pranzo, merenda, cena: fatto/saltato, cosa e porzione |
- **Frequenze** — ogni giorno, giorni specifici della settimana, oppure X volte a settimana.
- **Giorni non applicabili** — per una singola abitudine o per tutta la giornata (vacanza, malattia): non interrompono la serie e non contano nelle percentuali.
- **Streak** — serie attuale e record; in settimane per le abitudini "X volte a settimana".
- **Calendario** — vista mensile complessiva o per abitudine; tocca un giorno per vedere e modificare i dati.
- **Statistiche** — completamento settimanale/mensile, media del sonno, media dell'acqua, minuti di studio, grafici dell'andamento.
- **Tema chiaro/scuro** — segue il sistema, con scelta manuale.
- **Backup** — export e import dei dati in JSON.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · Recharts · Vitest

## Avvio

```bash
npm install
npm run dev
```

Altri comandi:

```bash
npm run build      # typecheck + build di produzione in dist/
npm test           # test della logica di dominio
```

Per provarla dal telefono nella stessa rete: `npm run dev -- --host` e apri l'indirizzo mostrato.

## Struttura

```
src/
├── types.ts            Modello dei dati (Habit, Entry, AppData…)
├── storage/            Unico punto di accesso ai dati
│   ├── types.ts        Interfaccia StorageAdapter
│   ├── localStorage.ts Implementazione Fase 1
│   ├── backup.ts       Validazione/migrazione ed export JSON
│   └── seed.ts         Abitudini iniziali
├── lib/                Logica pura, senza React (testata)
│   ├── dates.ts        Date locali YYYY-MM-DD, settimane da lunedì
│   ├── schedule.ts     Quando un'abitudine è prevista
│   ├── progress.ts     Avanzamento, completamento, stato del giorno
│   ├── streak.ts       Serie in giorni o settimane
│   ├── stats.ts        Percentuali e medie
│   └── sleep.ts        Calcolo delle ore di sonno
├── state/              Store React, tema, router via hash
├── components/         UI riutilizzabile, tracker per ogni tipo
└── pages/              Oggi, Calendario, Statistiche, Abitudini, Impostazioni
```

### Dati

Tutto l'accesso ai dati passa da `src/storage/`. L'interfaccia `StorageAdapter` è asincrona e granulare (salva un'abitudine, una registrazione, un giorno non applicabile…), così in Fase 2 si potrà sostituire l'implementazione localStorage con una Supabase cambiando solo `src/storage/index.ts`.

Le date sono stringhe locali `YYYY-MM-DD`: si confrontano come testo e non risentono di fusi orari o cambi dell'ora legale.

### Regole di calcolo

- **Completato** — obiettivo raggiunto: quantità ≥ obiettivo, ore di sonno ≥ obiettivo, minuti ≥ obiettivo (o almeno un minuto se non c'è obiettivo), pasti fatti ≥ obiettivo (4 di default).
- **Il sonno** si registra sul giorno del risveglio.
- **Oggi** non ancora completato non interrompe la serie e non abbassa le percentuali: è "in corso". Lo stesso vale per la settimana in corso delle abitudini "X volte a settimana".
- **Abitudini settimanali** — se nella settimana ci sono giorni non applicabili, le volte richieste scendono al massimo ai giorni disponibili.
- Le statistiche partono dalla data di creazione dell'abitudine; inserire dati in un giorno precedente sposta l'inizio a quel giorno.

## Roadmap

- [x] **Fase 1** — app completa con dati locali, export/import JSON
- [ ] **Fase 2** — login e sincronizzazione con Supabase, pubblicazione su Vercel
- [ ] **Fase 3** — PWA installabile, notifiche promemoria, screenshot
