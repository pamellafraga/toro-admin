-- Corrige o cliente fictício (Maria Santos) para usar um plano real: Confort R$ 800,00
-- Planos reais: Básico R$ 500, Confort R$ 800, Premium R$ 1.500
-- Rode no SQL Editor do Supabase para ajustar dados já existentes.

update public.contracts
set monthly_value = 800
where client_id = (select id from public.clients where cpf_cnpj = '52998224735' limit 1);

update public.nfe_documents
set total_value = 800
where client_id = (select id from public.clients where cpf_cnpj = '52998224735' limit 1)
  and status = 'emitida';
