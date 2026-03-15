-- Comissões: a página /dashboard/comissoes usa apenas a tabela contracts.
-- Nenhuma tabela nova é necessária.
-- Coluna usada: contracts.origem_comercial (criada em 019_contracts_origem_comercial.sql)
-- e contracts.created_at, contracts.monthly_value para agrupar vendas por mês e por comercial.
-- Este script só documenta; pode rodar sem efeito em dados.

comment on column public.contracts.origem_comercial is 'Ex.: Comercial - Lisete, Website, etc. Usado para filtro "meus clientes" e página Comissões (vendas por comercial no mês).';
