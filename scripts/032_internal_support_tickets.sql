-- Chamados de suporte interno (solicitações vindas das ferramentas dos clientes → painel TI)
create table if not exists public.internal_support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_tool text,
  client_identifier text,
  client_email text,
  subject text not null,
  message text not null,
  status text not null default 'aberto'
    check (status in ('aberto', 'em_andamento', 'resolvido', 'fechado')),
  priority text not null default 'normal'
    check (priority in ('baixa', 'normal', 'alta', 'urgente')),
  external_user_id text
);

create index if not exists internal_support_tickets_created_at_idx
  on public.internal_support_tickets (created_at desc);
create index if not exists internal_support_tickets_status_idx
  on public.internal_support_tickets (status);

alter table public.internal_support_tickets enable row level security;

-- Sem políticas públicas: leitura/escrita via service role nas API routes.

create or replace function public.set_internal_support_tickets_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists internal_support_tickets_updated_at on public.internal_support_tickets;
create trigger internal_support_tickets_updated_at
  before update on public.internal_support_tickets
  for each row execute function public.set_internal_support_tickets_updated_at();
