-- Permite status 'aguardando_produto' e payment_status 'pendente' em contracts
alter table public.contracts drop constraint if exists contracts_status_check;
alter table public.contracts add constraint contracts_status_check
  check (status in ('ativa', 'inativa', 'pendente', 'cancelada', 'aguardando_produto'));

alter table public.contracts drop constraint if exists contracts_payment_status_check;
alter table public.contracts add constraint contracts_payment_status_check
  check (payment_status in ('em_dia', 'atrasado', 'cancelado', 'pendente'));
