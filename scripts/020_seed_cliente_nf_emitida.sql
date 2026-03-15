-- Cliente fictício com NF-e já gerada e produto liberado (contrato ativo)
-- A Maria Santos assina o produto que o painel já usa: "Software de Gestão".
-- Se esse produto não existir, ele é criado aqui.
--
-- Onde ver este cliente no painel:
--   • Clientes   – lista e detalhe: "Maria Santos", produto ativo
--   • Financeiro – contrato em dia, R$ 800 (Confort), produto ativo
--   • NF-e       – nota emitida (100001), Software de Gestão · Plano Confort (R$ 800,00)
--   • Produtos   – no card "Software de Gestão": contrato da Maria Santos, ativo
--
-- Planos do produto (valores únicos): Básico R$ 500, Confort R$ 800, Premium R$ 1.500.
-- Rode este script no SQL Editor do Supabase (ou psql) para criar o cliente fictício.
-- Pode ser executado mais de uma vez: evita duplicar contrato e NF.

-- 0) Garantir que o produto "Software de Gestão" existe (o único que o painel exibe)
do $$
begin
  if not exists (select 1 from public.products where name = 'Software de Gestão' limit 1) then
    insert into public.products (name, description, icon, slug, monthly_price, is_active)
    values ('Software de Gestão', 'Apólice de Seguro - Modalidade Garantias', 'monitor', 'software-gestao-apolice-seguro', 800, true);
  end if;
end $$;

-- 1) Cliente fictício (colunas base: 003_clients; se tiver 011_alter_tables_for_app, preenche o resto no bloco abaixo)
insert into public.clients (
  name, cpf_cnpj, email, phone, company, address
)
values (
  'Maria Santos',
  '52998224735',
  'maria.santos@exemplo.com',
  '(51) 98765-4321',
  'Empresa Demo Ltda',
  'Rua das Flores, 100 - Centro - Porto Alegre/RS - 90000000'
)
on conflict (cpf_cnpj) do update set
  name = excluded.name,
  email = excluded.email,
  phone = excluded.phone,
  company = excluded.company,
  address = excluded.address,
  updated_at = now();

-- 2) Contrato ativo (produto liberado) — um por cliente fictício, se ainda não existir
do $$
declare
  v_client_id uuid;
  v_product_id uuid;
  v_contract_id uuid;
begin
  select id into v_client_id from public.clients where cpf_cnpj = '52998224735' limit 1;
  if v_client_id is null then return; end if;

  -- Produto que o painel usa: Software de Gestão (criado no bloco 0 se não existir)
  select id into v_product_id from public.products where name = 'Software de Gestão' limit 1;
  if v_product_id is null then return; end if;

  -- Atualiza contrato existente para Software de Gestão (se já rodou o script antes com outro produto)
  update public.contracts set product_id = v_product_id where client_id = v_client_id;

  -- Só cria contrato se ainda não existir para este cliente (plano Confort R$ 800)
  if not exists (select 1 from public.contracts where client_id = v_client_id limit 1) then
    insert into public.contracts (client_id, product_id, status, start_date, monthly_value, payment_status, payment_day, notes)
    values (v_client_id, v_product_id, 'ativa', current_date - 30, 800, 'em_dia', 10,
      'Cliente fictício para demonstração – NF já emitida e produto liberado.')
    returning id into v_contract_id;
  else
    select id into v_contract_id from public.contracts where client_id = v_client_id order by created_at desc limit 1;
  end if;

  if v_contract_id is null then return; end if;

  -- Garantir valor do plano Confort (R$ 800) em contrato e NF já existentes
  update public.contracts set monthly_value = 800 where client_id = v_client_id;
  update public.nfe_documents set total_value = 800 where client_id = v_client_id and status = 'emitida';

  -- 3) NF-e já emitida (nota gerada) — uma por cliente fictício, se ainda não existir
  if not exists (
    select 1 from public.nfe_documents
    where client_id = v_client_id and status = 'emitida'
    limit 1
  ) then
    insert into public.nfe_documents (
      client_id, client_name, total_value, status, number, series,
      provider_payload, nature_operation, cfop
    )
    values (
      v_client_id,
      'Maria Santos',
      800,
      'emitida',
      '100001',
      '1',
      jsonb_build_object('contract_id', v_contract_id, 'simulated', true),
      'Prestação de serviços',
      '5933'
    );
  end if;
end $$;
