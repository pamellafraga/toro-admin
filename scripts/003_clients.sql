-- Clients table
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cpf_cnpj text not null unique,
  email text not null default '',
  phone text not null default '',
  company text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "clients_select" on public.clients for select using (true);
create policy "clients_insert" on public.clients for insert with check (true);
create policy "clients_update" on public.clients for update using (true);
create policy "clients_delete" on public.clients for delete using (true);

create trigger clients_updated_at
  before update on public.clients
  for each row
  execute function public.update_updated_at();
