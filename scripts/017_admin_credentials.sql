-- Tabela de credenciais/acessos (Senhas de Administração)
-- Usada pela página /dashboard/senhas (apenas admin)
create table if not exists public.admin_credentials (
  id uuid primary key default gen_random_uuid(),
  service text not null,
  login text not null,
  password text not null,
  url text,
  notes text,
  category text not null default 'FERRAMENTAS' check (category in ('FERRAMENTAS', 'DOMÍNIOS', 'HOSPEDAGENS', 'OUTROS')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_credentials enable row level security;

-- Remove políticas antigas se existirem (permite rodar o script de novo sem erro)
drop policy if exists "admin_credentials_select" on public.admin_credentials;
drop policy if exists "admin_credentials_insert" on public.admin_credentials;
drop policy if exists "admin_credentials_update" on public.admin_credentials;
drop policy if exists "admin_credentials_delete" on public.admin_credentials;

-- Apenas usuários autenticados podem ler (a página restringe a admin no app)
create policy "admin_credentials_select" on public.admin_credentials
  for select using (auth.role() = 'authenticated');

create policy "admin_credentials_insert" on public.admin_credentials
  for insert with check (auth.role() = 'authenticated');

create policy "admin_credentials_update" on public.admin_credentials
  for update using (auth.role() = 'authenticated');

create policy "admin_credentials_delete" on public.admin_credentials
  for delete using (auth.role() = 'authenticated');

-- Trigger updated_at
create or replace function public.set_admin_credentials_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admin_credentials_updated_at on public.admin_credentials;
create trigger admin_credentials_updated_at
  before update on public.admin_credentials
  for each row execute function public.set_admin_credentials_updated_at();
