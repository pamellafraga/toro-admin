-- Atribuição de cada contrato ao comercial que registrou (para filtro "meus clientes")
alter table public.contracts add column if not exists origem_comercial text;

comment on column public.contracts.origem_comercial is 'Ex.: Comercial - Lisete, Website, etc. Usado para filtrar vendas por comercial.';
