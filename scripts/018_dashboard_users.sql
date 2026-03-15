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

-- Seed: 2 admins (Admin, Pamella) e 2 comerciais (Lisete, Stefanie)
-- Senha Admin/Pamella: Xpress@101029
-- Senha Lisete: Lisete2026 | Senha Stefanie: Stefanie2026
insert into public.dashboard_users (username, password_hash, role, display_name)
values
  ('Admin', '004337285807f7743d82a633a3ca0c825ab00303fb88a27245690867397215da', 'admin', 'Admin'),
  ('Pamella', '004337285807f7743d82a633a3ca0c825ab00303fb88a27245690867397215da', 'admin', 'Pamella'),
  ('Roberto', '004337285807f7743d82a633a3ca0c825ab00303fb88a27245690867397215da', 'admin', 'Roberto'),
  ('Lisete', '490a7fbdccffa5419b4e3e403332d66b8fa0efef53d2e9e8aa366430fb170cdc', 'comercial', 'Lisete'),
  ('Stefanie', '697f60f318546d50ee5c81c70059bf3b541c988e0958bdb0199055bd10f52f93', 'comercial', 'Stefanie')
on conflict (username) do update set
  password_hash = excluded.password_hash,
  role = excluded.role,
  display_name = excluded.display_name,
  updated_at = now();
