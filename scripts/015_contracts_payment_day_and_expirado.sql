-- Coluna payment_day em contracts (dia do vencimento)
alter table public.contracts add column if not exists payment_day integer not null default 10;

-- Permite payment_status 'expirado'
alter table public.contracts drop constraint if exists contracts_payment_status_check;
alter table public.contracts add constraint contracts_payment_status_check
  check (payment_status in ('em_dia', 'atrasado', 'cancelado', 'pendente', 'expirado'));
