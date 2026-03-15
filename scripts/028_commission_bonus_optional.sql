-- Opcional: guardar percentual de bônus padrão para a página Comissões.
-- Se não usar esta tabela, a página continua funcionando com o % digitado na tela.

create table if not exists public.commission_bonus_rules (
  id uuid primary key default gen_random_uuid(),
  -- null = regra global (só deve existir uma); preenchido = regra por comercial
  comercial_display_name text,
  bonus_percent decimal(5,2) not null default 10 check (bonus_percent >= 0 and bonus_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.commission_bonus_rules enable row level security;
create policy "commission_bonus_rules_all" on public.commission_bonus_rules for all using (true);

create trigger commission_bonus_rules_updated_at
  before update on public.commission_bonus_rules
  for each row execute function public.update_updated_at();

-- Apenas uma regra global (comercial_display_name null)
create unique index if not exists idx_commission_bonus_one_global
  on public.commission_bonus_rules ((true)) where comercial_display_name is null;

comment on table public.commission_bonus_rules is 'Percentual de bônus para a página Comissões. Uma linha com comercial_display_name null = padrão global; outras = por comercial.';

-- Regra global padrão 10% (só insere se ainda não existir)
insert into public.commission_bonus_rules (comercial_display_name, bonus_percent)
select null, 10
where not exists (select 1 from public.commission_bonus_rules where comercial_display_name is null);
