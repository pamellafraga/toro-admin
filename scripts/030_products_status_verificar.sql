-- Garante que a coluna product_status existe e confere o valor do "Software de Gestão"
-- Rode no SQL Editor do Supabase se o status não mudar ao clicar em Pausado.

-- 1) Criar coluna e constraint se ainda não existirem (igual ao 016)
alter table public.products add column if not exists product_status text not null default 'no_ar';
alter table public.products drop constraint if exists products_product_status_check;
alter table public.products add constraint products_product_status_check
  check (product_status in ('no_ar', 'pausado', 'desativado'));

-- 2) Ver quantos produtos têm nome "Software de Gestão" e qual o status de cada um
select id, name, product_status, created_at
from public.products
where name = 'Software de Gestão';

-- 3) Se quiser forçar o status para pausado (só para testar), descomente a linha abaixo:
-- update public.products set product_status = 'pausado' where name = 'Software de Gestão';
