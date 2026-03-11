-- Colunas extras em clients (endereço completo e nome fantasia)
alter table public.clients add column if not exists zip_code text;
alter table public.clients add column if not exists district text;
alter table public.clients add column if not exists number text;
alter table public.clients add column if not exists city text;
alter table public.clients add column if not exists state text;
alter table public.clients add column if not exists company_name text;

-- Colunas extras em products (slug, preço, ativo)
alter table public.products add column if not exists slug text unique;
alter table public.products add column if not exists monthly_price decimal(10,2) not null default 0;
alter table public.products add column if not exists is_active boolean not null default true;

-- Dia de vencimento no contrato
alter table public.contracts add column if not exists payment_day integer not null default 10;
