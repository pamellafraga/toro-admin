-- Contracts table
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  status text not null default 'pendente' check (status in ('ativa', 'inativa', 'pendente', 'cancelada')),
  start_date date not null default current_date,
  end_date date,
  monthly_value decimal(10,2) not null default 0,
  payment_status text not null default 'em_dia' check (payment_status in ('em_dia', 'atrasado', 'cancelado')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contracts enable row level security;

create policy "contracts_select" on public.contracts for select using (true);
create policy "contracts_insert" on public.contracts for insert with check (true);
create policy "contracts_update" on public.contracts for update using (true);
create policy "contracts_delete" on public.contracts for delete using (true);

create trigger contracts_updated_at
  before update on public.contracts
  for each row
  execute function public.update_updated_at();
