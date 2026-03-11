-- Seguradoras / Leads table (atualizado com kanban e campos extras)
create table if not exists public.seguradoras (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text not null default '',
  email text,
  phone text,
  city text,
  state text,
  contact_status text not null default 'pending' check (contact_status in ('pending', 'in_progress', 'contacted', 'converted', 'rejected')),
  kanban_column text not null default 'novo' check (kanban_column in ('novo', 'contatando', 'negociando', 'convertido', 'perdido')),
  assigned_to uuid references public.profiles(id) on delete set null,
  assigned_name text,
  notes text,
  last_contact_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.seguradoras enable row level security;
create policy "seguradoras_select" on public.seguradoras for select using (true);
create policy "seguradoras_insert" on public.seguradoras for insert with check (true);
create policy "seguradoras_update" on public.seguradoras for update using (true);
create policy "seguradoras_delete" on public.seguradoras for delete using (true);
create trigger seguradoras_updated_at
  before update on public.seguradoras
  for each row
  execute function public.update_updated_at();
