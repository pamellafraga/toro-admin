-- Status do produto: NO AR, PAUSADO, DESATIVADO
alter table public.products add column if not exists product_status text not null default 'no_ar';
alter table public.products drop constraint if exists products_product_status_check;
alter table public.products add constraint products_product_status_check
  check (product_status in ('no_ar', 'pausado', 'desativado'));
