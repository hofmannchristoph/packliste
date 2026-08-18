-- Packliste: Tabelle für den Live-Sync.
-- Im Supabase-Dashboard unter "SQL Editor" einmal komplett ausführen.

create table if not exists public.packlists (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.packlists enable row level security;

-- ACHTUNG: Diese Policies prüfen den Familien-Code NICHT.
--
-- `using (true)` heisst: wer den anon-Key hat, darf jede Zeile lesen und
-- überschreiben – eine Abfrage ohne id-Filter liefert alles. Dass die App nur
-- ihren eigenen Haushalt sieht, ist allein eine Konvention des Clients
-- (`.eq('id', hid)` in src/sync.js), keine Schranke des Servers.
--
-- Für eine private Packliste zweier Personen ist das eine vertretbare, aber
-- bewusste Entscheidung. Der einzige Widerruf ist das Rotieren des anon-Keys
-- im Dashboard. Wer es strenger will: select/update auf `using (false)` setzen
-- und den Zugriff über eine `security definer`-Funktion mit dem Code als
-- Argument führen – siehe README, Abschnitt „Wie sicher ist das?".

drop policy if exists "packlists_select" on public.packlists;
create policy "packlists_select" on public.packlists
  for select to anon, authenticated using (true);

drop policy if exists "packlists_insert" on public.packlists;
create policy "packlists_insert" on public.packlists
  for insert to anon, authenticated with check (
    id ~ '^[a-z0-9]{16,40}$' and pg_column_size(data) < 400000
  );

drop policy if exists "packlists_update" on public.packlists;
create policy "packlists_update" on public.packlists
  for update to anon, authenticated using (true) with check (
    pg_column_size(data) < 400000
  );

-- Realtime einschalten, damit Änderungen sofort auf dem anderen Gerät ankommen.
alter table public.packlists replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'packlists'
  ) then
    alter publication supabase_realtime add table public.packlists;
  end if;
end $$;
