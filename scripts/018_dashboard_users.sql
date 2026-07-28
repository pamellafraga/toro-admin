-- Usuários do dashboard (login local: Admin, Pamella, Lisete, Stefanie)
-- Senhas hasheadas com SHA-256 (em produção considere bcrypt/argon2)
create table if not exists public.dashboard_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'comercial')),
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_users enable row level security;

drop policy if exists "dashboard_users_select" on public.dashboard_users;
create policy "dashboard_users_select" on public.dashboard_users for select using (true);

-- Trigger updated_at
create or replace function public.set_dashboard_users_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists dashboard_users_updated_at on public.dashboard_users;
create trigger dashboard_users_updated_at
  before update on public.dashboard_users
  for each row execute function public.set_dashboard_users_updated_at();

-- Seed: usuário admin Toro
-- Senha: toro@101029
insert into public.dashboard_users (username, password_hash, role, display_name)
values
  ('Toro', '8c5a17ecacc48131bdf1ba58a7fa974de370ed4c6d309f6509e831411736ceab', 'admin', 'Toro')
on conflict (username) do update set
  password_hash = excluded.password_hash,
  role = excluded.role,
  display_name = excluded.display_name,
  updated_at = now();
