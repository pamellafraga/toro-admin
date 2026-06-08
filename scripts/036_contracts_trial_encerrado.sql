-- Status de produto após fim do teste grátis LicitaPregão + payment_status de trial
alter table public.contracts drop constraint if exists contracts_status_check;
alter table public.contracts add constraint contracts_status_check
  check (status in (
    'ativa', 'inativa', 'pendente', 'cancelada', 'aguardando_produto', 'trial', 'trial_encerrado'
  ));

alter table public.contracts drop constraint if exists contracts_payment_status_check;
alter table public.contracts add constraint contracts_payment_status_check
  check (payment_status in (
    'em_dia', 'atrasado', 'cancelado', 'pendente', 'expirado', 'trial', 'trial_expirado'
  ));

-- Contratos já marcados como inativos após trial voltam ao status dedicado
update public.contracts
set status = 'trial_encerrado', updated_at = now()
where status = 'inativa'
  and payment_status = 'trial_expirado';
