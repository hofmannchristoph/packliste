-- Packliste: Tabelle für den Live-Sync.
-- Im Supabase-Dashboard unter "SQL Editor" einmal komplett ausführen.

create table if not exists public.packlists (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.packlists enable row level security;

-- Zugriff nur mit Kenntnis der zufälligen Reise-ID (20 Zeichen).
-- Der Anon-Key allein zeigt keine Liste an, weil ohne ID nichts abgefragt
-- werden kann – die Policies erlauben aber jede ID. Wer Code UND Key hat,
-- kommt an die Liste. Für eine private Packliste zweier Personen ist das
-- vertretbar; teile den Code entsprechend nicht öffentlich.

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
