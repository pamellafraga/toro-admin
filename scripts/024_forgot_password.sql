-- E-mail nos usuários do dashboard (para Esqueci minha senha)
alter table public.dashboard_users
  add column if not exists email text unique;

-- Códigos de redefinição de senha (código por e-mail, válido por 15 min)
create table if not exists public.password_reset_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_codes_email on public.password_reset_codes (email);
create index if not exists idx_password_reset_codes_expires on public.password_reset_codes (expires_at);

alter table public.password_reset_codes enable row level security;
create policy "password_reset_codes_all" on public.password_reset_codes for all using (true);

comment on table public.password_reset_codes is 'Códigos enviados por e-mail para redefinição de senha (Esqueci minha senha).';
