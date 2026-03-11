-- Tabela de documentos NF-e (pendentes e emitidos)
create table if not exists public.nfe_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  total_value decimal(10,2) not null default 0,
  nature_operation text,
  cfop text,
  status text not null default 'pendente',
  number text,
  series text,
  provider_id text,
  provider_payload jsonb,
  provider_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nfe_documents enable row level security;

create policy "nfe_documents_select" on public.nfe_documents for select using (true);
create policy "nfe_documents_insert" on public.nfe_documents for insert with check (true);
create policy "nfe_documents_update" on public.nfe_documents for update using (true);
create policy "nfe_documents_delete" on public.nfe_documents for delete using (true);

create trigger nfe_documents_updated_at
  before update on public.nfe_documents
  for each row
  execute function public.update_updated_at();
