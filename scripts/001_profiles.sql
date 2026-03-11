-- Profiles table for dashboard users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'custom' check (role in ('admin', 'marketing', 'captacao', 'financeiro', 'custom')),
  is_active boolean not null default true,
  permissions jsonb not null default '[]'::jsonb,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Admin can see all profiles
create policy "profiles_select_all" on public.profiles for select using (true);
-- Admin can insert profiles
create policy "profiles_insert" on public.profiles for insert with check (true);
-- Admin can update profiles
create policy "profiles_update" on public.profiles for update using (true);
-- Admin can delete profiles
create policy "profiles_delete" on public.profiles for delete using (true);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role, permissions)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.email),
    coalesce(new.raw_user_meta_data ->> 'role', 'custom'),
    coalesce((new.raw_user_meta_data -> 'permissions')::jsonb, '["home"]'::jsonb)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.update_updated_at();
