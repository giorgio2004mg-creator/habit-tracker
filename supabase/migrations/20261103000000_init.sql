-- Schema iniziale: abitudini, registrazioni, giorni non applicabili, impostazioni.
-- Ogni riga appartiene a un utente e la Row Level Security impedisce di
-- leggere o modificare i dati degli altri.

create table public.habits (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  name text not null,
  category text not null default '',
  color text not null,
  icon text not null,
  type text not null check (type in ('check', 'quantita', 'durata', 'sonno', 'pasti')),
  frequency jsonb not null,
  target numeric,
  unit text,
  step numeric,
  archived boolean not null default false,
  sort_order integer not null default 0,
  start_date date not null,
  primary key (user_id, id)
);

create table public.entries (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  habit_id text not null,
  date date not null,
  na boolean not null default false,
  data jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, habit_id, date),
  foreign key (user_id, habit_id) references public.habits (user_id, id) on delete cascade
);

create table public.na_days (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  note text,
  primary key (user_id, date)
);

create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  theme text not null default 'system' check (theme in ('system', 'light', 'dark'))
);

alter table public.habits enable row level security;
alter table public.entries enable row level security;
alter table public.na_days enable row level security;
alter table public.settings enable row level security;

create policy "Solo i propri dati" on public.habits
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Solo i propri dati" on public.entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Solo i propri dati" on public.na_days
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Solo i propri dati" on public.settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Accesso tramite la Data API solo per gli utenti autenticati
grant select, insert, update, delete on public.habits, public.entries, public.na_days, public.settings to authenticated;
revoke all on public.habits, public.entries, public.na_days, public.settings from anon;
